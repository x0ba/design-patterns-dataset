import { getStr } from "./wasm.ts";
import { Status } from "./constants.ts";
/**
 * Errors which can occur while interacting with
 * a database.
 *
 * This is an extension over the standard JS Error
 * object which provides additional details.
 */ export class SqliteError extends Error {
  /**
   * Instances of this class should not be constructed
   * directly and only be obtained
   * from exceptions raised in this module.
   */ constructor(context, code){
    let message;
    let status;
    if (typeof context === "string") {
      message = context;
      status = Status.Unknown;
    } else {
      message = getStr(context, context.get_sqlite_error_str());
      status = context.get_status();
    }
    super(message);
    this.code = code ?? status;
    this.name = "SqliteError";
  }
  /**
   * The SQLite status code which caused this error.
   *
   * Errors that originate in the JavaScript part of
   * the library will not have an associated status
   * code. For these errors, the code will be
   * `Status.Unknown`.
   *
   * These codes are accessible via
   * the exported `Status` object.
   */ code;
  /**
   * Key of code in exported `status`
   * object.
   *
   * E.g. if `code` is `19`,
   * `codeName` would be `SqliteConstraint`.
   */ get codeName() {
    return Status[this.code];
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvLy51aS1jYXB0dXJlL3ZlbmRvci9zcWxpdGUvc3JjL2Vycm9yLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFdhc20gfSBmcm9tIFwiLi4vYnVpbGQvc3FsaXRlLmpzXCI7XG5pbXBvcnQgeyBnZXRTdHIgfSBmcm9tIFwiLi93YXNtLnRzXCI7XG5pbXBvcnQgeyBTdGF0dXMgfSBmcm9tIFwiLi9jb25zdGFudHMudHNcIjtcblxuLyoqXG4gKiBFcnJvcnMgd2hpY2ggY2FuIG9jY3VyIHdoaWxlIGludGVyYWN0aW5nIHdpdGhcbiAqIGEgZGF0YWJhc2UuXG4gKlxuICogVGhpcyBpcyBhbiBleHRlbnNpb24gb3ZlciB0aGUgc3RhbmRhcmQgSlMgRXJyb3JcbiAqIG9iamVjdCB3aGljaCBwcm92aWRlcyBhZGRpdGlvbmFsIGRldGFpbHMuXG4gKi9cbmV4cG9ydCBjbGFzcyBTcWxpdGVFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgLyoqXG4gICAqIEluc3RhbmNlcyBvZiB0aGlzIGNsYXNzIHNob3VsZCBub3QgYmUgY29uc3RydWN0ZWRcbiAgICogZGlyZWN0bHkgYW5kIG9ubHkgYmUgb2J0YWluZWRcbiAgICogZnJvbSBleGNlcHRpb25zIHJhaXNlZCBpbiB0aGlzIG1vZHVsZS5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGNvbnRleHQ6IFdhc20gfCBzdHJpbmcsIGNvZGU/OiBTdGF0dXMpIHtcbiAgICBsZXQgbWVzc2FnZTtcbiAgICBsZXQgc3RhdHVzO1xuICAgIGlmICh0eXBlb2YgY29udGV4dCA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgbWVzc2FnZSA9IGNvbnRleHQ7XG4gICAgICBzdGF0dXMgPSBTdGF0dXMuVW5rbm93bjtcbiAgICB9IGVsc2Uge1xuICAgICAgbWVzc2FnZSA9IGdldFN0cihjb250ZXh0LCBjb250ZXh0LmdldF9zcWxpdGVfZXJyb3Jfc3RyKCkpO1xuICAgICAgc3RhdHVzID0gY29udGV4dC5nZXRfc3RhdHVzKCk7XG4gICAgfVxuICAgIHN1cGVyKG1lc3NhZ2UpO1xuICAgIHRoaXMuY29kZSA9IGNvZGUgPz8gc3RhdHVzO1xuICAgIHRoaXMubmFtZSA9IFwiU3FsaXRlRXJyb3JcIjtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgU1FMaXRlIHN0YXR1cyBjb2RlIHdoaWNoIGNhdXNlZCB0aGlzIGVycm9yLlxuICAgKlxuICAgKiBFcnJvcnMgdGhhdCBvcmlnaW5hdGUgaW4gdGhlIEphdmFTY3JpcHQgcGFydCBvZlxuICAgKiB0aGUgbGlicmFyeSB3aWxsIG5vdCBoYXZlIGFuIGFzc29jaWF0ZWQgc3RhdHVzXG4gICAqIGNvZGUuIEZvciB0aGVzZSBlcnJvcnMsIHRoZSBjb2RlIHdpbGwgYmVcbiAgICogYFN0YXR1cy5Vbmtub3duYC5cbiAgICpcbiAgICogVGhlc2UgY29kZXMgYXJlIGFjY2Vzc2libGUgdmlhXG4gICAqIHRoZSBleHBvcnRlZCBgU3RhdHVzYCBvYmplY3QuXG4gICAqL1xuICBjb2RlOiBTdGF0dXM7XG5cbiAgLyoqXG4gICAqIEtleSBvZiBjb2RlIGluIGV4cG9ydGVkIGBzdGF0dXNgXG4gICAqIG9iamVjdC5cbiAgICpcbiAgICogRS5nLiBpZiBgY29kZWAgaXMgYDE5YCxcbiAgICogYGNvZGVOYW1lYCB3b3VsZCBiZSBgU3FsaXRlQ29uc3RyYWludGAuXG4gICAqL1xuICBnZXQgY29kZU5hbWUoKToga2V5b2YgdHlwZW9mIFN0YXR1cyB7XG4gICAgcmV0dXJuIFN0YXR1c1t0aGlzLmNvZGVdIGFzIGtleW9mIHR5cGVvZiBTdGF0dXM7XG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxTQUFTLE1BQU0sUUFBUSxZQUFZO0FBQ25DLFNBQVMsTUFBTSxRQUFRLGlCQUFpQjtBQUV4Qzs7Ozs7O0NBTUMsR0FDRCxPQUFPLE1BQU0sb0JBQW9CO0VBQy9COzs7O0dBSUMsR0FDRCxZQUFZLE9BQXNCLEVBQUUsSUFBYSxDQUFFO0lBQ2pELElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSSxPQUFPLFlBQVksVUFBVTtNQUMvQixVQUFVO01BQ1YsU0FBUyxPQUFPLE9BQU87SUFDekIsT0FBTztNQUNMLFVBQVUsT0FBTyxTQUFTLFFBQVEsb0JBQW9CO01BQ3RELFNBQVMsUUFBUSxVQUFVO0lBQzdCO0lBQ0EsS0FBSyxDQUFDO0lBQ04sSUFBSSxDQUFDLElBQUksR0FBRyxRQUFRO0lBQ3BCLElBQUksQ0FBQyxJQUFJLEdBQUc7RUFDZDtFQUVBOzs7Ozs7Ozs7O0dBVUMsR0FDRCxLQUFhO0VBRWI7Ozs7OztHQU1DLEdBQ0QsSUFBSSxXQUFnQztJQUNsQyxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO0VBQzFCO0FBQ0YifQ==
// denoCacheMetadata=5663043666787192708,3201207286888481527