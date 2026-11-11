# DramaVideo 支付管理交互原型

[打开支付管理原型](https://zanehawkelin-lang.github.io/drama-statistics-review/payment-management/#payment)

支付管理独立存放于本目录，沿用原后台视觉和已验证的单页交互。六个站点为 TideWatch、QuikDrama、PlotNests、Prutora、Dramazas、Dramuzi，分别使用此前确认的业务域名作为演示资料。

## 功能

- 支付管理单页：页面内选择站点、查看当前收款配置、维护 PSP 和多个商户账户。
- 全局默认、本站指定、恢复继承、多站点指定配置及保存前影响预览。
- 共享账户的站点授权、支付方式、启停与在用关系校验。
- SKU 的 PSP／具体账户关联、付费面板、推广链接与示例订单。
- 收款优先级为“链接指定 ＞ 站点指定 ＞ 全局默认”，PSP 和账户始终整组选择。
- 各模块独立保存站点筛选；默认变更影响后续新订单，历史订单和原订阅保留原关系。

账户表单不提供接口配置、币种、交易类型及商品列表的重复编辑。商品统一美元，交易能力沿用已有账户记录，商品关联在 SKU 管理维护。

所有商户号、账户能力、商品及订单均为演示数据。没有生产接口、真实扣款、支付密钥或数据库；业务域名下生成的推广路径不会真实发布。本版不包含分流、自动备用切换及订阅迁移。

## 本地预览

在当前目录启动静态文件服务，访问 `http://127.0.0.1:8798/#payment`：

```sh
python3 -m http.server 8798 --bind 127.0.0.1
```

GitHub Pages 直接使用本目录的 HTML、CSS 和 JavaScript，不需要安装依赖或构建。

## 检查

```sh
node --check app.js
node --check model.js
node --check page-scopes.js
node check-model.cjs
node check-page-scopes.cjs
```

包含 49 项业务规则和 10 项页面站点状态检查。需要单文件副本时，可运行 `python3 build.py` 生成 `dist/index.html`；该输出不参与本目录的 GitHub Pages 发布。

## 演示记录

操作仅保存在当前浏览器、当前网站来源下，首次打开 GitHub Pages 从初始示例开始。原在线站点的浏览器记录不会自动迁移；可通过“复位示例”恢复初始配置。

本次发布复用已发布支付原型的源代码，业务脚本、样式与 HTML 均保持一致。源码来源提交：`07082af4a06ce16fc08919a01a7ff71c5583fee0`。
