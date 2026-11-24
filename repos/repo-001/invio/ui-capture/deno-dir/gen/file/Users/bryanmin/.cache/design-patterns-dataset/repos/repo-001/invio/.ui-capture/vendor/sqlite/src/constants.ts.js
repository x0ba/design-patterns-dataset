/**
 * Status codes which can be returned
 * by SQLite.
 *
 * Also see https://www.sqlite.org/rescode.html.
 */ export var Status = /*#__PURE__*/ function(Status) {
  /** Unknown status. */ Status[Status["Unknown"] = -1] = "Unknown";
  /** Successful result. */ Status[Status["SqliteOk"] = 0] = "SqliteOk";
  /** Generic error. */ Status[Status["SqliteError"] = 1] = "SqliteError";
  /** Internal logic error in SQLite. */ Status[Status["SqliteInternal"] = 2] = "SqliteInternal";
  /** Access permission denied. */ Status[Status["SqlitePerm"] = 3] = "SqlitePerm";
  /** Callback routine requested an abort. */ Status[Status["SqliteAbort"] = 4] = "SqliteAbort";
  /** The database file is locked. */ Status[Status["SqliteBusy"] = 5] = "SqliteBusy";
  /** A table in the database is locked. */ Status[Status["SqliteLocked"] = 6] = "SqliteLocked";
  /** A `malloc()` failed. */ Status[Status["SqliteNoMem"] = 7] = "SqliteNoMem";
  /** Attempt to write a read-only database. */ Status[Status["SqliteReadOnly"] = 8] = "SqliteReadOnly";
  /** Operation terminated by `sqlite3_interrupt()`. */ Status[Status["SqliteInterrupt"] = 9] = "SqliteInterrupt";
  /** Some kind of disk I/O error occurred. */ Status[Status["SqliteIOErr"] = 10] = "SqliteIOErr";
  /** The database disk image is malformed. */ Status[Status["SqliteCorrupt"] = 11] = "SqliteCorrupt";
  /** Unknown opcode in `sqlite3_file_control()`. */ Status[Status["SqliteNotFound"] = 12] = "SqliteNotFound";
  /** Insertion failed because database is full. */ Status[Status["SqliteFull"] = 13] = "SqliteFull";
  /** Unable to open the database file. */ Status[Status["SqliteCantOpen"] = 14] = "SqliteCantOpen";
  /** Database lock protocol error. */ Status[Status["SqliteProtocol"] = 15] = "SqliteProtocol";
  /** Internal use only. */ Status[Status["SqliteEmpty"] = 16] = "SqliteEmpty";
  /** The database schema changed. */ Status[Status["SqliteSchema"] = 17] = "SqliteSchema";
  /** String or BLOB exceeds size limit. */ Status[Status["SqliteTooBig"] = 18] = "SqliteTooBig";
  /** Abort due to constraint violation. */ Status[Status["SqliteConstraint"] = 19] = "SqliteConstraint";
  /** Data type mismatch. */ Status[Status["SqliteMismatch"] = 20] = "SqliteMismatch";
  /** Library used incorrectly. */ Status[Status["SqliteMisuse"] = 21] = "SqliteMisuse";
  /** Uses OS features not supported on host. */ Status[Status["SqliteNoLFS"] = 22] = "SqliteNoLFS";
  /** Authorization denied. */ Status[Status["SqliteAuth"] = 23] = "SqliteAuth";
  /** Not used. */ Status[Status["SqliteFormat"] = 24] = "SqliteFormat";
  /** 2nd parameter to `sqlite3_bind` out of range. */ Status[Status["SqliteRange"] = 25] = "SqliteRange";
  /** File opened that is not a database file. */ Status[Status["SqliteNotADB"] = 26] = "SqliteNotADB";
  /** Notifications from `sqlite3_log()`. */ Status[Status["SqliteNotice"] = 27] = "SqliteNotice";
  /** Warnings from `sqlite3_log()`. */ Status[Status["SqliteWarning"] = 28] = "SqliteWarning";
  /** `sqlite3_step()` has another row ready. */ Status[Status["SqliteRow"] = 100] = "SqliteRow";
  /** `sqlite3_step()` has finished executing. */ Status[Status["SqliteDone"] = 101] = "SqliteDone";
  return Status;
}({});
export var OpenFlags = /*#__PURE__*/ function(OpenFlags) {
  OpenFlags[OpenFlags["ReadOnly"] = 1] = "ReadOnly";
  OpenFlags[OpenFlags["ReadWrite"] = 2] = "ReadWrite";
  OpenFlags[OpenFlags["Create"] = 4] = "Create";
  OpenFlags[OpenFlags["Uri"] = 64] = "Uri";
  OpenFlags[OpenFlags["Memory"] = 128] = "Memory";
  return OpenFlags;
}({});
export var DeserializeFlags = /*#__PURE__*/ function(DeserializeFlags) {
  DeserializeFlags[DeserializeFlags["FreeOnClose"] = 1] = "FreeOnClose";
  DeserializeFlags[DeserializeFlags["Resizeable"] = 2] = "Resizeable";
  DeserializeFlags[DeserializeFlags["ReadOnly"] = 4] = "ReadOnly";
  return DeserializeFlags;
}({});
export var FunctionFlags = /*#__PURE__*/ function(FunctionFlags) {
  FunctionFlags[FunctionFlags["Deterministic"] = 2048] = "Deterministic";
  FunctionFlags[FunctionFlags["DirectOnly"] = 524288] = "DirectOnly";
  return FunctionFlags;
}({});
export var Types = /*#__PURE__*/ function(Types) {
  Types[Types["Integer"] = 1] = "Integer";
  Types[Types["Float"] = 2] = "Float";
  Types[Types["Text"] = 3] = "Text";
  Types[Types["Blob"] = 4] = "Blob";
  Types[Types["Null"] = 5] = "Null";
  Types[Types["BigInteger"] = 6] = "BigInteger";
  return Types;
}({});
export var Values = /*#__PURE__*/ function(Values) {
  Values[Values["Error"] = -1] = "Error";
  Values[Values["Null"] = 0] = "Null";
  return Values;
}({});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvLy51aS1jYXB0dXJlL3ZlbmRvci9zcWxpdGUvc3JjL2NvbnN0YW50cy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFN0YXR1cyBjb2RlcyB3aGljaCBjYW4gYmUgcmV0dXJuZWRcbiAqIGJ5IFNRTGl0ZS5cbiAqXG4gKiBBbHNvIHNlZSBodHRwczovL3d3dy5zcWxpdGUub3JnL3Jlc2NvZGUuaHRtbC5cbiAqL1xuZXhwb3J0IGVudW0gU3RhdHVzIHtcbiAgLyoqIFVua25vd24gc3RhdHVzLiAqL1xuICBVbmtub3duID0gLTEsXG5cbiAgLyoqIFN1Y2Nlc3NmdWwgcmVzdWx0LiAqL1xuICBTcWxpdGVPayA9IDAsXG4gIC8qKiBHZW5lcmljIGVycm9yLiAqL1xuICBTcWxpdGVFcnJvciA9IDEsXG4gIC8qKiBJbnRlcm5hbCBsb2dpYyBlcnJvciBpbiBTUUxpdGUuICovXG4gIFNxbGl0ZUludGVybmFsID0gMixcbiAgLyoqIEFjY2VzcyBwZXJtaXNzaW9uIGRlbmllZC4gKi9cbiAgU3FsaXRlUGVybSA9IDMsXG4gIC8qKiBDYWxsYmFjayByb3V0aW5lIHJlcXVlc3RlZCBhbiBhYm9ydC4gKi9cbiAgU3FsaXRlQWJvcnQgPSA0LFxuICAvKiogVGhlIGRhdGFiYXNlIGZpbGUgaXMgbG9ja2VkLiAqL1xuICBTcWxpdGVCdXN5ID0gNSxcbiAgLyoqIEEgdGFibGUgaW4gdGhlIGRhdGFiYXNlIGlzIGxvY2tlZC4gKi9cbiAgU3FsaXRlTG9ja2VkID0gNixcbiAgLyoqIEEgYG1hbGxvYygpYCBmYWlsZWQuICovXG4gIFNxbGl0ZU5vTWVtID0gNyxcbiAgLyoqIEF0dGVtcHQgdG8gd3JpdGUgYSByZWFkLW9ubHkgZGF0YWJhc2UuICovXG4gIFNxbGl0ZVJlYWRPbmx5ID0gOCxcbiAgLyoqIE9wZXJhdGlvbiB0ZXJtaW5hdGVkIGJ5IGBzcWxpdGUzX2ludGVycnVwdCgpYC4gKi9cbiAgU3FsaXRlSW50ZXJydXB0ID0gOSxcbiAgLyoqIFNvbWUga2luZCBvZiBkaXNrIEkvTyBlcnJvciBvY2N1cnJlZC4gKi9cbiAgU3FsaXRlSU9FcnIgPSAxMCxcbiAgLyoqIFRoZSBkYXRhYmFzZSBkaXNrIGltYWdlIGlzIG1hbGZvcm1lZC4gKi9cbiAgU3FsaXRlQ29ycnVwdCA9IDExLFxuICAvKiogVW5rbm93biBvcGNvZGUgaW4gYHNxbGl0ZTNfZmlsZV9jb250cm9sKClgLiAqL1xuICBTcWxpdGVOb3RGb3VuZCA9IDEyLFxuICAvKiogSW5zZXJ0aW9uIGZhaWxlZCBiZWNhdXNlIGRhdGFiYXNlIGlzIGZ1bGwuICovXG4gIFNxbGl0ZUZ1bGwgPSAxMyxcbiAgLyoqIFVuYWJsZSB0byBvcGVuIHRoZSBkYXRhYmFzZSBmaWxlLiAqL1xuICBTcWxpdGVDYW50T3BlbiA9IDE0LFxuICAvKiogRGF0YWJhc2UgbG9jayBwcm90b2NvbCBlcnJvci4gKi9cbiAgU3FsaXRlUHJvdG9jb2wgPSAxNSxcbiAgLyoqIEludGVybmFsIHVzZSBvbmx5LiAqL1xuICBTcWxpdGVFbXB0eSA9IDE2LFxuICAvKiogVGhlIGRhdGFiYXNlIHNjaGVtYSBjaGFuZ2VkLiAqL1xuICBTcWxpdGVTY2hlbWEgPSAxNyxcbiAgLyoqIFN0cmluZyBvciBCTE9CIGV4Y2VlZHMgc2l6ZSBsaW1pdC4gKi9cbiAgU3FsaXRlVG9vQmlnID0gMTgsXG4gIC8qKiBBYm9ydCBkdWUgdG8gY29uc3RyYWludCB2aW9sYXRpb24uICovXG4gIFNxbGl0ZUNvbnN0cmFpbnQgPSAxOSxcbiAgLyoqIERhdGEgdHlwZSBtaXNtYXRjaC4gKi9cbiAgU3FsaXRlTWlzbWF0Y2ggPSAyMCxcbiAgLyoqIExpYnJhcnkgdXNlZCBpbmNvcnJlY3RseS4gKi9cbiAgU3FsaXRlTWlzdXNlID0gMjEsXG4gIC8qKiBVc2VzIE9TIGZlYXR1cmVzIG5vdCBzdXBwb3J0ZWQgb24gaG9zdC4gKi9cbiAgU3FsaXRlTm9MRlMgPSAyMixcbiAgLyoqIEF1dGhvcml6YXRpb24gZGVuaWVkLiAqL1xuICBTcWxpdGVBdXRoID0gMjMsXG4gIC8qKiBOb3QgdXNlZC4gKi9cbiAgU3FsaXRlRm9ybWF0ID0gMjQsXG4gIC8qKiAybmQgcGFyYW1ldGVyIHRvIGBzcWxpdGUzX2JpbmRgIG91dCBvZiByYW5nZS4gKi9cbiAgU3FsaXRlUmFuZ2UgPSAyNSxcbiAgLyoqIEZpbGUgb3BlbmVkIHRoYXQgaXMgbm90IGEgZGF0YWJhc2UgZmlsZS4gKi9cbiAgU3FsaXRlTm90QURCID0gMjYsXG4gIC8qKiBOb3RpZmljYXRpb25zIGZyb20gYHNxbGl0ZTNfbG9nKClgLiAqL1xuICBTcWxpdGVOb3RpY2UgPSAyNyxcbiAgLyoqIFdhcm5pbmdzIGZyb20gYHNxbGl0ZTNfbG9nKClgLiAqL1xuICBTcWxpdGVXYXJuaW5nID0gMjgsXG4gIC8qKiBgc3FsaXRlM19zdGVwKClgIGhhcyBhbm90aGVyIHJvdyByZWFkeS4gKi9cbiAgU3FsaXRlUm93ID0gMTAwLFxuICAvKiogYHNxbGl0ZTNfc3RlcCgpYCBoYXMgZmluaXNoZWQgZXhlY3V0aW5nLiAqL1xuICBTcWxpdGVEb25lID0gMTAxLFxufVxuXG5leHBvcnQgZW51bSBPcGVuRmxhZ3Mge1xuICBSZWFkT25seSA9IDB4MDAwMDAwMDEsXG4gIFJlYWRXcml0ZSA9IDB4MDAwMDAwMDIsXG4gIENyZWF0ZSA9IDB4MDAwMDAwMDQsXG4gIFVyaSA9IDB4MDAwMDAwNDAsXG4gIE1lbW9yeSA9IDB4MDAwMDAwODAsXG59XG5cbmV4cG9ydCBlbnVtIERlc2VyaWFsaXplRmxhZ3Mge1xuICBGcmVlT25DbG9zZSA9IDEsXG4gIFJlc2l6ZWFibGUgPSAyLFxuICBSZWFkT25seSA9IDQsXG59XG5cbmV4cG9ydCBlbnVtIEZ1bmN0aW9uRmxhZ3Mge1xuICBEZXRlcm1pbmlzdGljID0gMHgwMDAwMDA4MDAsXG4gIERpcmVjdE9ubHkgPSAweDAwMDA4MDAwMCxcbn1cblxuZXhwb3J0IGVudW0gVHlwZXMge1xuICBJbnRlZ2VyID0gMSxcbiAgRmxvYXQgPSAyLFxuICBUZXh0ID0gMyxcbiAgQmxvYiA9IDQsXG4gIE51bGwgPSA1LFxuICBCaWdJbnRlZ2VyID0gNixcbn1cblxuZXhwb3J0IGVudW0gVmFsdWVzIHtcbiAgRXJyb3IgPSAtMSxcbiAgTnVsbCA9IDAsXG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7O0NBS0MsR0FDRCxPQUFPLElBQUEsQUFBSyxnQ0FBQTtFQUNWLG9CQUFvQjtFQUdwQix1QkFBdUI7RUFFdkIsbUJBQW1CO0VBRW5CLG9DQUFvQztFQUVwQyw4QkFBOEI7RUFFOUIseUNBQXlDO0VBRXpDLGlDQUFpQztFQUVqQyx1Q0FBdUM7RUFFdkMseUJBQXlCO0VBRXpCLDJDQUEyQztFQUUzQyxtREFBbUQ7RUFFbkQsMENBQTBDO0VBRTFDLDBDQUEwQztFQUUxQyxnREFBZ0Q7RUFFaEQsK0NBQStDO0VBRS9DLHNDQUFzQztFQUV0QyxrQ0FBa0M7RUFFbEMsdUJBQXVCO0VBRXZCLGlDQUFpQztFQUVqQyx1Q0FBdUM7RUFFdkMsdUNBQXVDO0VBRXZDLHdCQUF3QjtFQUV4Qiw4QkFBOEI7RUFFOUIsNENBQTRDO0VBRTVDLDBCQUEwQjtFQUUxQixjQUFjO0VBRWQsa0RBQWtEO0VBRWxELDZDQUE2QztFQUU3Qyx3Q0FBd0M7RUFFeEMsbUNBQW1DO0VBRW5DLDRDQUE0QztFQUU1Qyw2Q0FBNkM7U0FoRW5DO01Ba0VYO0FBRUQsT0FBTyxJQUFBLEFBQUssbUNBQUE7Ozs7OztTQUFBO01BTVg7QUFFRCxPQUFPLElBQUEsQUFBSywwQ0FBQTs7OztTQUFBO01BSVg7QUFFRCxPQUFPLElBQUEsQUFBSyx1Q0FBQTs7O1NBQUE7TUFHWDtBQUVELE9BQU8sSUFBQSxBQUFLLCtCQUFBOzs7Ozs7O1NBQUE7TUFPWDtBQUVELE9BQU8sSUFBQSxBQUFLLGdDQUFBOzs7U0FBQTtNQUdYIn0=
// denoCacheMetadata=11762984082111071880,14313290999303297630