// import { Matrix } from 'ml-matrix'; // TODO: Use Matrix for advanced semantic analysis
import { PorterStemmer, TfIdf, WordTokenizer } from 'natural';
import type {
  ContextDefinition,
  ContextSignal,
  SemanticAnalysis,
} from '../../data/models/core';
import type { Logger } from '../../utils/logger';

export class SemanticAnalyzer {
  private tfidf: TfIdf;
  private tokenizer: WordTokenizer;
  private logger: Logger;
  private contextVectors: Map<string, number[]> = new Map();
  private vocabularySize = 0;
  private isInitialized = false;

  constructor(logger: Logger) {
    this.logger = logger;
    this.tfidf = new TfIdf();
    this.tokenizer = new WordTokenizer();
  }

  async initialize(contexts: ContextDefinition[]): Promise<void> {
    try {
      this.logger.debug('Initializing semantic analyzer', {
        contextsCount: contexts.length,
      });

      // Build TF-IDF model from context definitions and keywords
      this.tfidf = new TfIdf();

      contexts.forEach(context => {
        // Create representative text for each context
        const contextText = this.buildContextText(context);
        this.tfidf.addDocument(contextText);
      });

      // Build vocabulary and context vectors
      await this.buildContextVectors(contexts);

      this.isInitialized = true;
      this.logger.info('Semantic analyzer initialized', {
        vocabularySize: this.vocabularySize,
        contextsProcessed: contexts.length,
      });
    } catch (error) {
      this.logger.error('Failed to initialize semantic analyzer', error);
      throw error;
    }
  }

  private buildContextText(context: ContextDefinition): string {
    // Combine context name, description, and keywords into representative text
    const parts = [
      context.name,
      context.description || '',
      ...context.keywords,
    ];

    return parts.join(' ').toLowerCase();
  }

  private async buildContextVectors(
    contexts: ContextDefinition[]
  ): Promise<void> {
    // Get vocabulary from TF-IDF
    const vocabulary = new Set<string>();

    contexts.forEach((_context, docIndex) => {
      this.tfidf.listTerms(docIndex).forEach(term => {
        vocabulary.add(term.term);
      });
    });

    this.vocabularySize = vocabulary.size;
    const vocabularyArray = Array.from(vocabulary);

    // Build vectors for each context
    contexts.forEach((context, docIndex) => {
      const vector = new Array(this.vocabularySize).fill(0);
      const terms = this.tfidf.listTerms(docIndex);

      terms.forEach(term => {
        const termIndex = vocabularyArray.indexOf(term.term);
        if (termIndex !== -1) {
          vector[termIndex] = term.tfidf;
        }
      });

      this.contextVectors.set(context.id, vector);
    });
  }

  async analyzeContentShift(
    previousContent: string,
    newContent: string,
    threshold: number = 0.3
  ): Promise<ContextSignal[]> {
    if (!this.isInitialized) {
      throw new Error('Semantic analyzer not initialized');
    }

    try {
      const previousAnalysis = await this.analyzeContent(previousContent);
      const newAnalysis = await this.analyzeContent(newContent);

      // Calculate semantic similarity between old and new content
      const similarity = this.calculateCosineSimilarity(
        previousAnalysis.tfidfVector,
        newAnalysis.tfidfVector
      );

      const signals: ContextSignal[] = [];

      // If similarity is below threshold, there's been a significant semantic shift
      if (similarity < 1 - threshold) {
        // Find the best matching context for the new content
        const bestMatch = this.findBestContextMatch(newAnalysis.tfidfVector);

        if (bestMatch) {
          signals.push({
            type: 'semantic',
            confidence: 1 - similarity, // Higher confidence for lower similarity
            evidence: {
              similarity,
              previousKeywords: previousAnalysis.keywords.slice(0, 5),
              newKeywords: newAnalysis.keywords.slice(0, 5),
              suggestedContext: bestMatch.contextId,
              contextScore: bestMatch.score,
            },
            weight: 1.0,
          });
        }
      }

      this.logger.debug('Semantic analysis completed', {
        similarity,
        signalsGenerated: signals.length,
        previousKeywords: previousAnalysis.keywords.length,
        newKeywords: newAnalysis.keywords.length,
      });

      return signals;
    } catch (error) {
      this.logger.error('Semantic analysis failed', error);
      throw error;
    }
  }

  private async analyzeContent(content: string): Promise<SemanticAnalysis> {
    // Tokenize and stem the content
    const tokens = this.tokenizer.tokenize(content.toLowerCase()) || [];
    const stemmedTokens = tokens.map(token => PorterStemmer.stem(token));

    // Create a temporary document for TF-IDF analysis
    const tempTfidf = new TfIdf();
    tempTfidf.addDocument(stemmedTokens.join(' '));

    // Extract TF-IDF vector
    const tfidfVector = new Array(this.vocabularySize).fill(0);
    const terms = tempTfidf.listTerms(0);

    // Build keyword list with scores
    const keywords = terms
      .filter(term => term.tfidf > 0.01) // Filter out very low-score terms
      .sort((a, b) => b.tfidf - a.tfidf)
      .slice(0, 20) // Top 20 keywords
      .map(term => ({
        word: term.term,
        score: term.tfidf,
      }));

    return {
      tfidfVector,
      keywords,
      similarity: 0, // Will be calculated externally
      topicDistribution: this.calculateTopicDistribution(tfidfVector),
    };
  }

  private calculateCosineSimilarity(
    vectorA: number[],
    vectorB: number[]
  ): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error(
        'Vectors must have the same length for cosine similarity'
      );
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      const valueA = vectorA[i];
      const valueB = vectorB[i];
      if (valueA !== undefined && valueB !== undefined) {
        dotProduct += valueA * valueB;
        normA += valueA * valueA;
        normB += valueB * valueB;
      }
    }

    if (normA === 0 || normB === 0) {
      return 0; // No similarity if either vector is zero
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private findBestContextMatch(
    contentVector: number[]
  ): { contextId: string; score: number } | null {
    let bestMatch: { contextId: string; score: number } | null = null;

    for (const [contextId, contextVector] of this.contextVectors) {
      const similarity = this.calculateCosineSimilarity(
        contentVector,
        contextVector
      );

      if (!bestMatch || similarity > bestMatch.score) {
        bestMatch = { contextId, score: similarity };
      }
    }

    // Only return matches with reasonable confidence
    return bestMatch && bestMatch.score > 0.1 ? bestMatch : null;
  }

  private calculateTopicDistribution(
    tfidfVector: number[]
  ): Record<string, number> {
    // Simple topic distribution based on context similarities
    const distribution: Record<string, number> = {};

    for (const [contextId, contextVector] of this.contextVectors) {
      const similarity = this.calculateCosineSimilarity(
        tfidfVector,
        contextVector
      );
      distribution[contextId] = similarity;
    }

    // Normalize distribution
    const total = Object.values(distribution).reduce(
      (sum, value) => sum + (value || 0),
      0
    );
    if (total > 0) {
      for (const contextId in distribution) {
        const value = distribution[contextId];
        if (value !== undefined) {
          distribution[contextId] = value / total;
        }
      }
    }

    return distribution;
  }

  async addContext(context: ContextDefinition): Promise<void> {
    if (!this.isInitialized) {
      this.logger.warn('Cannot add context to uninitialized analyzer');
      return;
    }

    try {
      // Add new document to TF-IDF
      const contextText = this.buildContextText(context);
      this.tfidf.addDocument(contextText);

      // Rebuild vectors (simplified approach - in production might optimize this)
      const contexts = Array.from(this.contextVectors.keys()).map(
        id =>
          ({
            id,
            name: '',
            keywords: [],
            color: '',
            isActive: true,
            createdAt: new Date(),
            metadata: {},
          }) as ContextDefinition
      );
      contexts.push(context);

      await this.buildContextVectors(contexts);

      this.logger.debug('Context added to semantic analyzer', {
        contextId: context.id,
      });
    } catch (error) {
      this.logger.error('Failed to add context to semantic analyzer', error);
      throw error;
    }
  }

  async removeContext(contextId: string): Promise<void> {
    this.contextVectors.delete(contextId);
    this.logger.debug('Context removed from semantic analyzer', { contextId });
  }

  getVocabularySize(): number {
    return this.vocabularySize;
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}
