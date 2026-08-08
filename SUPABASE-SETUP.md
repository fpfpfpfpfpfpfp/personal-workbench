# Supabase 免费共享配置

1. 打开 https://supabase.com 并创建免费项目。
2. 进入 SQL Editor，新建查询并执行 `supabase-setup.sql` 的全部内容。
3. 打开 Project Settings > Data API。
4. 复制 Project URL 和 anon public key。
5. 将这两个值填入 `config.js`：

```js
window.WORKBENCH_REMOTE = {
  supabaseUrl: "https://你的项目.supabase.co",
  supabaseAnonKey: "你的 anon public key",
};
```

6. 重新上传 `index.html`、`styles.css`、`app.js` 和 `config.js` 到 Netlify。

完成后，访客会读取同一份共享数据；使用编辑密码 `321` 保存的修改会写入云端。
