# 建議引擎測試

`prototype.html` 是單檔無建置的頁面，所以測試用 node ＋ DOM stub 直接 eval 真實程式碼。

```bash
cd points-race
A=$(grep -n '^<script>$' prototype.html|head -1|cut -d: -f1)
B=$(grep -n '^</script>$' prototype.html|tail -1|cut -d: -f1)
sed -n "$((A+1)),$((B-1))p" prototype.html > /tmp/main.js
node test/run.js /tmp/main.js test/tbody.js
```

`run.js` 提供最小的 `document` / `navigator` / `localStorage` stub，
把主 script 與測試檔在**同一次 eval** 內執行（`let` 在 eval 裡是獨立作用域，
分兩次 eval 會看不到 `groups`）。
