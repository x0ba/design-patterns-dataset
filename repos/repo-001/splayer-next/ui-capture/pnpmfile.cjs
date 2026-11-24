// 沙箱禁止写入 .gitmodules / .vscode/* 等文件，而 electron-builder 打包链路中的部分包
// （sanitize-filename、xmlbuilder 等）自带这些文件。UI 构建不需要打包工具，安装时移除。
const DROP = ["electron-builder", "@electron/rebuild", "sanitize-filename"];
module.exports = {
  hooks: {
    readPackage(pkg) {
      for (const field of ["dependencies", "devDependencies", "optionalDependencies"]) {
        for (const name of DROP) if (pkg[field] && pkg[field][name]) delete pkg[field][name];
      }
      return pkg;
    },
  },
};
