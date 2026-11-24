import { Node } from './node.ts';
export class Trie {
  context = {
    varIndex: 0
  };
  root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [] // [mark, original string]
    ;
    for(let i = 0;;){
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m)=>{
        const mark = `@\\${i}`;
        groups[i] = [
          mark,
          m
        ];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    /**
     *  - pattern (:label, :label{0-9]+}, ...)
     *  - /* wildcard
     *  - character
     */ const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for(let i = groups.length - 1; i >= 0; i--){
      const [mark] = groups[i];
      for(let j = tokens.length - 1; j >= 0; j--){
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.root.insert(tokens, index, paramAssoc, this.context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.root.buildRegExpStr();
    if (regexp === '') {
      return [
        /^$/,
        [],
        []
      ] // never match
      ;
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex)=>{
      if (typeof handlerIndex !== 'undefined') {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return '$()';
      }
      if (typeof paramIndex !== 'undefined') {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return '';
      }
      return '';
    });
    return [
      new RegExp(`^${regexp}`),
      indexReplacementMap,
      paramReplacementMap
    ];
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvLy51aS1jYXB0dXJlL3ZlbmRvci9ob25vL2Rlbm9fZGlzdC9yb3V0ZXIvcmVnLWV4cC1yb3V0ZXIvdHJpZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgdHlwZSB7IFBhcmFtQXNzb2NBcnJheSwgQ29udGV4dCB9IGZyb20gJy4vbm9kZS50cydcbmltcG9ydCB7IE5vZGUgfSBmcm9tICcuL25vZGUudHMnXG5cbmV4cG9ydCB0eXBlIFJlcGxhY2VtZW50TWFwID0gbnVtYmVyW11cblxuZXhwb3J0IGNsYXNzIFRyaWUge1xuICBjb250ZXh0OiBDb250ZXh0ID0geyB2YXJJbmRleDogMCB9XG4gIHJvb3Q6IE5vZGUgPSBuZXcgTm9kZSgpXG5cbiAgaW5zZXJ0KHBhdGg6IHN0cmluZywgaW5kZXg6IG51bWJlciwgcGF0aEVycm9yQ2hlY2tPbmx5OiBib29sZWFuKTogUGFyYW1Bc3NvY0FycmF5IHtcbiAgICBjb25zdCBwYXJhbUFzc29jOiBQYXJhbUFzc29jQXJyYXkgPSBbXVxuXG4gICAgY29uc3QgZ3JvdXBzOiBbc3RyaW5nLCBzdHJpbmddW10gPSBbXSAvLyBbbWFyaywgb3JpZ2luYWwgc3RyaW5nXVxuICAgIGZvciAobGV0IGkgPSAwOyA7ICkge1xuICAgICAgbGV0IHJlcGxhY2VkID0gZmFsc2VcbiAgICAgIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xce1tefV0rXFx9L2csIChtKSA9PiB7XG4gICAgICAgIGNvbnN0IG1hcmsgPSBgQFxcXFwke2l9YFxuICAgICAgICBncm91cHNbaV0gPSBbbWFyaywgbV1cbiAgICAgICAgaSsrXG4gICAgICAgIHJlcGxhY2VkID0gdHJ1ZVxuICAgICAgICByZXR1cm4gbWFya1xuICAgICAgfSlcbiAgICAgIGlmICghcmVwbGFjZWQpIHtcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgLSBwYXR0ZXJuICg6bGFiZWwsIDpsYWJlbHswLTldK30sIC4uLilcbiAgICAgKiAgLSAvKiB3aWxkY2FyZFxuICAgICAqICAtIGNoYXJhY3RlclxuICAgICAqL1xuICAgIGNvbnN0IHRva2VucyA9IHBhdGgubWF0Y2goLyg/OjpbXlxcL10rKXwoPzpcXC9cXCokKXwuL2cpIHx8IFtdXG4gICAgZm9yIChsZXQgaSA9IGdyb3Vwcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgY29uc3QgW21hcmtdID0gZ3JvdXBzW2ldXG4gICAgICBmb3IgKGxldCBqID0gdG9rZW5zLmxlbmd0aCAtIDE7IGogPj0gMDsgai0tKSB7XG4gICAgICAgIGlmICh0b2tlbnNbal0uaW5kZXhPZihtYXJrKSAhPT0gLTEpIHtcbiAgICAgICAgICB0b2tlbnNbal0gPSB0b2tlbnNbal0ucmVwbGFjZShtYXJrLCBncm91cHNbaV1bMV0pXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMucm9vdC5pbnNlcnQodG9rZW5zLCBpbmRleCwgcGFyYW1Bc3NvYywgdGhpcy5jb250ZXh0LCBwYXRoRXJyb3JDaGVja09ubHkpXG5cbiAgICByZXR1cm4gcGFyYW1Bc3NvY1xuICB9XG5cbiAgYnVpbGRSZWdFeHAoKTogW1JlZ0V4cCwgUmVwbGFjZW1lbnRNYXAsIFJlcGxhY2VtZW50TWFwXSB7XG4gICAgbGV0IHJlZ2V4cCA9IHRoaXMucm9vdC5idWlsZFJlZ0V4cFN0cigpXG4gICAgaWYgKHJlZ2V4cCA9PT0gJycpIHtcbiAgICAgIHJldHVybiBbL14kLywgW10sIFtdXSAvLyBuZXZlciBtYXRjaFxuICAgIH1cblxuICAgIGxldCBjYXB0dXJlSW5kZXggPSAwXG4gICAgY29uc3QgaW5kZXhSZXBsYWNlbWVudE1hcDogUmVwbGFjZW1lbnRNYXAgPSBbXVxuICAgIGNvbnN0IHBhcmFtUmVwbGFjZW1lbnRNYXA6IFJlcGxhY2VtZW50TWFwID0gW11cblxuICAgIHJlZ2V4cCA9IHJlZ2V4cC5yZXBsYWNlKC8jKFxcZCspfEAoXFxkKyl8XFwuXFwqXFwkL2csIChfLCBoYW5kbGVySW5kZXgsIHBhcmFtSW5kZXgpID0+IHtcbiAgICAgIGlmICh0eXBlb2YgaGFuZGxlckluZGV4ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBpbmRleFJlcGxhY2VtZW50TWFwWysrY2FwdHVyZUluZGV4XSA9IE51bWJlcihoYW5kbGVySW5kZXgpXG4gICAgICAgIHJldHVybiAnJCgpJ1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBwYXJhbUluZGV4ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBwYXJhbVJlcGxhY2VtZW50TWFwW051bWJlcihwYXJhbUluZGV4KV0gPSArK2NhcHR1cmVJbmRleFxuICAgICAgICByZXR1cm4gJydcbiAgICAgIH1cblxuICAgICAgcmV0dXJuICcnXG4gICAgfSlcblxuICAgIHJldHVybiBbbmV3IFJlZ0V4cChgXiR7cmVnZXhwfWApLCBpbmRleFJlcGxhY2VtZW50TWFwLCBwYXJhbVJlcGxhY2VtZW50TWFwXVxuICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsU0FBUyxJQUFJLFFBQVEsWUFBVztBQUloQyxPQUFPLE1BQU07RUFDWCxVQUFtQjtJQUFFLFVBQVU7RUFBRSxFQUFDO0VBQ2xDLE9BQWEsSUFBSSxPQUFNO0VBRXZCLE9BQU8sSUFBWSxFQUFFLEtBQWEsRUFBRSxrQkFBMkIsRUFBbUI7SUFDaEYsTUFBTSxhQUE4QixFQUFFO0lBRXRDLE1BQU0sU0FBNkIsRUFBRSxDQUFDLDBCQUEwQjs7SUFDaEUsSUFBSyxJQUFJLElBQUksSUFBTztNQUNsQixJQUFJLFdBQVc7TUFDZixPQUFPLEtBQUssT0FBTyxDQUFDLGNBQWMsQ0FBQztRQUNqQyxNQUFNLE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRztRQUN0QixNQUFNLENBQUMsRUFBRSxHQUFHO1VBQUM7VUFBTTtTQUFFO1FBQ3JCO1FBQ0EsV0FBVztRQUNYLE9BQU87TUFDVDtNQUNBLElBQUksQ0FBQyxVQUFVO1FBQ2I7TUFDRjtJQUNGO0lBRUE7Ozs7S0FJQyxHQUNELE1BQU0sU0FBUyxLQUFLLEtBQUssQ0FBQywrQkFBK0IsRUFBRTtJQUMzRCxJQUFLLElBQUksSUFBSSxPQUFPLE1BQU0sR0FBRyxHQUFHLEtBQUssR0FBRyxJQUFLO01BQzNDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLEVBQUU7TUFDeEIsSUFBSyxJQUFJLElBQUksT0FBTyxNQUFNLEdBQUcsR0FBRyxLQUFLLEdBQUcsSUFBSztRQUMzQyxJQUFJLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxHQUFHO1VBQ2xDLE1BQU0sQ0FBQyxFQUFFLEdBQUcsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsTUFBTSxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUU7VUFDaEQ7UUFDRjtNQUNGO0lBQ0Y7SUFFQSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLE9BQU8sWUFBWSxJQUFJLENBQUMsT0FBTyxFQUFFO0lBRTFELE9BQU87RUFDVDtFQUVBLGNBQXdEO0lBQ3RELElBQUksU0FBUyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWM7SUFDckMsSUFBSSxXQUFXLElBQUk7TUFDakIsT0FBTztRQUFDO1FBQU0sRUFBRTtRQUFFLEVBQUU7T0FBQyxDQUFDLGNBQWM7O0lBQ3RDO0lBRUEsSUFBSSxlQUFlO0lBQ25CLE1BQU0sc0JBQXNDLEVBQUU7SUFDOUMsTUFBTSxzQkFBc0MsRUFBRTtJQUU5QyxTQUFTLE9BQU8sT0FBTyxDQUFDLHlCQUF5QixDQUFDLEdBQUcsY0FBYztNQUNqRSxJQUFJLE9BQU8saUJBQWlCLGFBQWE7UUFDdkMsbUJBQW1CLENBQUMsRUFBRSxhQUFhLEdBQUcsT0FBTztRQUM3QyxPQUFPO01BQ1Q7TUFDQSxJQUFJLE9BQU8sZUFBZSxhQUFhO1FBQ3JDLG1CQUFtQixDQUFDLE9BQU8sWUFBWSxHQUFHLEVBQUU7UUFDNUMsT0FBTztNQUNUO01BRUEsT0FBTztJQUNUO0lBRUEsT0FBTztNQUFDLElBQUksT0FBTyxDQUFDLENBQUMsRUFBRSxRQUFRO01BQUc7TUFBcUI7S0FBb0I7RUFDN0U7QUFDRiJ9
// denoCacheMetadata=6288902351890539353,4887558856702338604