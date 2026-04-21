cd C:\Users\Administrator\Desktop\qihun-web\vue-project
# 方案：从 733d4c2 重新生成干净commit，只含 public/ 文件
# 先回到 733d4c2（db705bb 的父commit），工作区会保留 db705bb 的改动
git reset --hard 733d4c2
# 重新复制最新的 HTML 文件
Copy-Item -Path 'C:\Users\Administrator\Desktop\qihun-web\vue-project\dist-seo\cpu-value.html' -Destination 'C:\Users\Administrator\Desktop\qihun-web\vue-project\public\'
Copy-Item -Path 'C:\Users\Administrator\Desktop\qihun-web\vue-project\dist-seo\gpu-value.html' -Destination 'C:\Users\Administrator\Desktop\qihun-web\vue-project\public\'
Copy-Item -Path 'C:\Users\Administrator\Desktop\qihun-web\vue-project\dist-seo\sitemap-seo.xml' -Destination 'C:\Users\Administrator\Desktop\qihun-web\vue-project\public\'
# 只提交 public/，不提交 generate-seo.cjs
git add public/cpu-value.html public/gpu-value.html public/sitemap-seo.xml
git commit -m "feat: update CPU market copy (行情速递 title + revised notes)"
git push origin main --force
