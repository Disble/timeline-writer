import * as DiffMatchPatch from 'diff-match-patch';

export type Diff = DiffMatchPatch.Diff[];

export class DiffEngine {
  private dmp;

  constructor() {
    this.dmp = new DiffMatchPatch.diff_match_patch();
  }

  createDiff(oldContent: string, newContent: string): Diff {
    const diff = this.dmp.diff_main(oldContent, newContent);
    this.dmp.diff_cleanupSemantic(diff);
    return diff;
  }

  applyDiff(content: string, diff: Diff): string {
    const patches = this.dmp.patch_make(content, diff);
    const [newContent] = this.dmp.patch_apply(patches, content);
    return newContent;
  }

  validateDiff(content: string, diff: Diff, expected: string): boolean {
    const patchedContent = this.applyDiff(content, diff);
    return patchedContent === expected;
  }
} 
