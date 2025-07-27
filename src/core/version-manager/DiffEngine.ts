import { type Diff, diff_match_patch } from 'diff-match-patch';

export class DiffEngine {
  private dmp: typeof diff_match_patch.prototype;

  constructor() {
    this.dmp = new diff_match_patch();
  }

  createPatch(text1: string, text2: string): string {
    const diffs = this.dmp.diff_main(text1, text2);
    this.dmp.diff_cleanupSemantic(diffs);
    const patch = this.dmp.patch_make(text1, diffs);
    return this.dmp.patch_toText(patch);
  }

  applyPatch(text: string, patchText: string): string {
    const patches = this.dmp.patch_fromText(patchText);
    const [newText] = this.dmp.patch_apply(patches, text);
    return newText;
  }

  diff(text1: string, text2: string): Diff[] {
    return this.dmp.diff_main(text1, text2);
  }
}
