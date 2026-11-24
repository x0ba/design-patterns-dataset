import * as bcrypt from "./bcrypt/bcrypt.ts";
const context = self;
context.onmessage = (event)=>{
  let data = event.data;
  switch(data.action){
    case "hash":
      {
        context.postMessage(bcrypt.hashpw(data.payload.plaintext, data.payload.salt));
        break;
      }
    case "genSalt":
      {
        context.postMessage(bcrypt.gensalt(data.payload.log_rounds));
        break;
      }
    case "compare":
      {
        let result;
        try {
          result = bcrypt.checkpw(data.payload.plaintext, data.payload.hash);
        } catch  {
          result = false;
        }
        context.postMessage(result);
        break;
      }
    default:
      {
        throw Error("Invalid data sent to worker");
      }
  }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvLy51aS1jYXB0dXJlL3ZlbmRvci9iY3J5cHQvc3JjL3dvcmtlci50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBiY3J5cHQgZnJvbSBcIi4vYmNyeXB0L2JjcnlwdC50c1wiO1xuXG5jb25zdCBjb250ZXh0OiBXb3JrZXIgPSBzZWxmIGFzIGFueTtcblxuY29udGV4dC5vbm1lc3NhZ2UgPSAoZXZlbnQpID0+IHtcbiAgbGV0IGRhdGEgPSBldmVudC5kYXRhO1xuICBzd2l0Y2ggKGRhdGEuYWN0aW9uKSB7XG4gICAgY2FzZSBcImhhc2hcIjoge1xuICAgICAgY29udGV4dC5wb3N0TWVzc2FnZShcbiAgICAgICAgYmNyeXB0Lmhhc2hwdyhkYXRhLnBheWxvYWQucGxhaW50ZXh0LCBkYXRhLnBheWxvYWQuc2FsdCksXG4gICAgICApO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGNhc2UgXCJnZW5TYWx0XCI6IHtcbiAgICAgIGNvbnRleHQucG9zdE1lc3NhZ2UoXG4gICAgICAgIGJjcnlwdC5nZW5zYWx0KGRhdGEucGF5bG9hZC5sb2dfcm91bmRzKSxcbiAgICAgICk7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgY2FzZSBcImNvbXBhcmVcIjoge1xuICAgICAgbGV0IHJlc3VsdDogYm9vbGVhbjtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc3VsdCA9IGJjcnlwdC5jaGVja3B3KGRhdGEucGF5bG9hZC5wbGFpbnRleHQsIGRhdGEucGF5bG9hZC5oYXNoKTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGNvbnRleHQucG9zdE1lc3NhZ2UoXG4gICAgICAgIHJlc3VsdCxcbiAgICAgICk7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgZGVmYXVsdDoge1xuICAgICAgdGhyb3cgRXJyb3IoXCJJbnZhbGlkIGRhdGEgc2VudCB0byB3b3JrZXJcIik7XG4gICAgfVxuICB9XG59O1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksWUFBWSxxQkFBcUI7QUFFN0MsTUFBTSxVQUFrQjtBQUV4QixRQUFRLFNBQVMsR0FBRyxDQUFDO0VBQ25CLElBQUksT0FBTyxNQUFNLElBQUk7RUFDckIsT0FBUSxLQUFLLE1BQU07SUFDakIsS0FBSztNQUFRO1FBQ1gsUUFBUSxXQUFXLENBQ2pCLE9BQU8sTUFBTSxDQUFDLEtBQUssT0FBTyxDQUFDLFNBQVMsRUFBRSxLQUFLLE9BQU8sQ0FBQyxJQUFJO1FBRXpEO01BQ0Y7SUFDQSxLQUFLO01BQVc7UUFDZCxRQUFRLFdBQVcsQ0FDakIsT0FBTyxPQUFPLENBQUMsS0FBSyxPQUFPLENBQUMsVUFBVTtRQUV4QztNQUNGO0lBQ0EsS0FBSztNQUFXO1FBQ2QsSUFBSTtRQUNKLElBQUk7VUFDRixTQUFTLE9BQU8sT0FBTyxDQUFDLEtBQUssT0FBTyxDQUFDLFNBQVMsRUFBRSxLQUFLLE9BQU8sQ0FBQyxJQUFJO1FBQ25FLEVBQUUsT0FBTTtVQUNOLFNBQVM7UUFDWDtRQUNBLFFBQVEsV0FBVyxDQUNqQjtRQUVGO01BQ0Y7SUFDQTtNQUFTO1FBQ1AsTUFBTSxNQUFNO01BQ2Q7RUFDRjtBQUNGIn0=
// denoCacheMetadata=9350251834070637390,8821281045745029927