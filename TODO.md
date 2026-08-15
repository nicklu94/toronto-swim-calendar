# Toronto Swim Calendar Roadmap / 后续更新清单

Last updated / 最后更新：2026-08-15

This file tracks planned improvements. Mark an item complete only after it has
been deployed to the production site and verified.

本文件用于记录计划中的改进。只有在功能已部署到正式网站并完成验证后，才勾选为完成。

## Schedule filters / 场次筛选

- [x] Add a single time-point filter that shows sessions open at the selected time.
  增加单一时间点筛选，显示在所选时间仍开放的场次。
- [x] Add an indoor/outdoor pool filter.
  增加室内泳池／露天泳池筛选。
- [x] Add a multi-select day-of-week filter that hides unselected days.
  增加星期多选筛选，并隐藏未选中的日期。

## Filter panel usability / 筛选面板易用性

Feedback summary: Users value the filtering options, but the growing filter
panel leaves too little room for the results and makes schedules harder to read
and navigate.

反馈摘要：用户认可现有筛选功能，但随着筛选项增加，筛选面板占用空间过大，
导致结果区域太小，场次信息较难阅读和浏览。

- [x] Make the filter panel collapsible (for example, an accordion) and keep the
  results area comfortably readable and navigable on both mobile and desktop.
  将筛选面板改为可折叠设计（例如 Accordion），并确保手机端和电脑端的结果区域
  都有足够空间，便于阅读和操作。
- [x] Reduce excess spacing in the desktop header so the schedule summary appears
  in the first screen.
  压缩电脑端顶部多余留白，让场次统计栏可以直接显示在首屏。

## Data collection and automation / 数据抓取与自动更新

- [x] Fix the York Region daily refresh so Markham, Richmond Hill, and Vaughan schedules update alongside City of Toronto data.
  修复 York Region 每日抓取任务，让 Markham、Richmond Hill 和 Vaughan 的场次与 City of Toronto 数据一起更新。

## Regional coverage / 地区覆盖

- [ ] Add pool information and available swim schedules for Newmarket.
  添加 Newmarket 地区的泳池信息和可用游泳场次。
- [ ] Add pool information and available swim schedules for Aurora.
  添加 Aurora 地区的泳池信息和可用游泳场次。

## Chinese localization / 中文本地化

- [x] Translate city filter options into Chinese when the Chinese version is selected.
  中文版中的城市筛选选项改成中文。
- [x] Translate activity-type options into Chinese when the Chinese version is selected.
  中文版中的活动类型选项改成中文。

## Release banner / 版本公告

- [ ] Show the production release date and a short update summary in the banner whenever a new version launches.
  每次正式上线新版本时，在 Banner 显示上线日期和简短更新说明。

## Pool rating tags / 泳池评分标签

- [x] Add `Universal change room` / `无障碍／通用更衣室`.
- [x] Add `Outdoor pool` / `露天泳池`.
- [x] Add `Indoor pool` / `室内泳池`.
- [x] Display these tags in the language currently selected by the user.
  根据用户当前选择的语言显示对应标签。

