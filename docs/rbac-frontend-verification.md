# 前端动态权限实施与验证

对应设计：D:/ideaaiwork/aiwork/docs/superpowers/specs/2026-11-18-rbac-platform-design.md；计划Task 3。

## 行为与决策

- `src/store/user.ts` 是共享响应式权限来源。授权只读取 `/api/auth/info`，不采用登录快照或localStorage权限兜底；初始化、失败、退出清理旧会话字段。info请求10秒超时；强制刷新以版本号丢弃较早的响应。
- 所有登录方式统一保存token、读取info、决定落点。`sys:role:assign`或`sys:data-scope:assign`进入`/role`，无页面授权进入`/pending-authorization`。未登录进入`/login`；任意角色编码、无角色但有权限的会话均无需角色白名单。
- 菜单、路由、页面区块和动作按实际权限控制；角色编码仅显示。四角色if/else排他已解除。同页授权多功能会同时显示。
- 页面切换、窗口focus、浏览器页签回到前台刷新；保存权限/角色/范围后强制刷新本人；JSON和HTTP 403先隐藏权限再刷新。自定义指令保留DOM，可随会话授权恢复。
- 工作台读取服务器完整目录按模块分组，创建零权限角色，分页搜索账号、分配任意角色、配置角色范围1..4与账号院系班级归属。范围管理员可读安全角色/账号列表，不能请求权限目录或执行角色授予操作。
- 操作与查看权限独立：需选择记录的演示操作若缺少查看权限，会提示补充查看权限，不触发额外数据请求。
- 裁定：复用既有工作区，遵守“不提交、不启动/停止服务、不修改后端/数据库”。不另开工作树、不引入测试依赖、不生成子代理。

## 权限编码

页面映射与全部前端业务编码位于`src/utils/permission.ts`的`pagePermissions`。原spec编码保持。

额外发现并与后端目录负责人协调登记的本地演示动作：

- `resume:candidate:invite`、`resume:candidate:reject`
- `student:archive:remind`
- `job:recommend:push`
- `interview:candidate:review`、`interview:coaching:record`
- `interview:supervision:send`、`interview:training:remind`、`interview:ledger:export`

不把`admin`或`system:manage`解释为万能权限。通用数据维护权限全部由后端目录返回，前端工作台不硬编码过滤。

## 真实与演示边界

- 工作台管理、身份info、本人简历与就业统计使用现有HTTP接口。测试使用真实Axios拦截器及Vue组件，替换外部传输，不访问生产数据或真实AI/SMTP。
- 岗位页、实习页、候选人筛选、面试学情/台账、政策聊天和政策知识条目、题库编辑仍为本地演示；页面已明确标识。
- 面试摄像头仅本机预览；评分请求使用现有接口，失败后原有本地模拟报告仍明确标注。
- 院系树是本地演示，不再宣称读取sys_dept数据库。
- `/storage`与`/file-demo`保留原接口演示，但当前业务后端没有`/storage`文件服务，页面明确提示未接通，不宣称真实落库可用。仍以`storage:*`控制；未新增文件后端。
- 注册身份核验继续延期；没有新增总权限管理员公开注册入口。

## 验证证据

已观察回归测试先失败后通过：管理员万能权限、会话缺失、工作台缺失契约、旧角色排他、无权挂载请求、操作角色路由以及异步授权刷新竞争。

最终命令：

- `node --test tests/*.test.mjs`：23项通过（原6项保留，增加17项）。
- `npx vue-tsc --noEmit`：通过。
- `npm run build`：通过；存在既有主包大于500kB提示。
- 未启动服务，未做连接运行中业务后端的浏览器端到端验证。

测试覆盖精确授权/无通配、撤权与失败清空、指令恢复、任意角色三种桌面登录、零权限稳定路由、窗口focus撤权、Vue模板多区并存、无权不请求、Axios真实HTTP契约、清空授权、范围管理员独立工作台、JSON/HTTP 403刷新、401清理、旧异步响应丢弃、持有Token刷新根路径立即到达授权工作台。

首次类型检查发现package.json既有qrcode依赖未安装，已通过npm安装既有声明依赖；没有修改package.json或保留锁文件变动。

最终自审：按授权来源、路由终点、多功能并存、工作台读写权限及演示边界分别审查；未调用子代理。后续完整集成由父任务核验。

集成修复：GET `/system/users/{id}/student-scopes` 按现有后端 `Result<List<StudentScopeDTO>>` 返回数组，Axios解包后直接绑定列表；PUT继续提交`{scopes:[...]}`。真实响应形状fixture已先观察两项范围加载断言失败，再修正API类型和UI绑定；新增编辑并保存范围列表回归。
