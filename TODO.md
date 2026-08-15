# Toronto Swim Calendar Roadmap / 后续更新清单

Last updated / 最后更新：2026-08-15

This file tracks planned improvements. Mark an item complete only after it has
been deployed to the production site and verified.

本文件用于记录计划中的改进。只有在功能已部署到正式网站并完成验证后，才勾选为完成。

## Schedule filters / 场次筛选

- [ ] Add start-time and end-time filters so users can limit sessions to a preferred time range.
  增加开始时间和结束时间筛选，让用户只查看合适时段的场次。
- [ ] Add an indoor/outdoor pool filter.
  增加室内泳池／露天泳池筛选。
- [ ] Add a day-of-week filter.
  增加星期几筛选。

## Filter panel usability / 筛选面板易用性

Feedback summary: Users value the filtering options, but the growing filter
panel leaves too little room for the results and makes schedules harder to read
and navigate.

反馈摘要：用户认可现有筛选功能，但随着筛选项增加，筛选面板占用空间过大，
导致结果区域太小，场次信息较难阅读和浏览。

- [ ] Make the filter panel collapsible (for example, an accordion) and keep the
  results area comfortably readable and navigable on both mobile and desktop.
  将筛选面板改为可折叠设计（例如 Accordion），并确保手机端和电脑端的结果区域
  都有足够空间，便于阅读和操作。

## Data collection and automation / 数据抓取与自动更新

- [ ] Fix the York Region daily refresh so Markham, Richmond Hill, and Vaughan schedules update alongside City of Toronto data.
  修复 York Region 每日抓取任务，让 Markham、Richmond Hill 和 Vaughan 的场次与 City of Toronto 数据一起更新。

## Regional coverage / 地区覆盖

- [ ] Add pool information and available swim schedules for Newmarket.
  添加 Newmarket 地区的泳池信息和可用游泳场次。
- [ ] Add pool information and available swim schedules for Aurora.
  添加 Aurora 地区的泳池信息和可用游泳场次。

## Chinese localization / 中文本地化

- [ ] Translate city filter options into Chinese when the Chinese version is selected.
  中文版中的城市筛选选项改成中文。
- [ ] Translate activity-type options into Chinese when the Chinese version is selected.
  中文版中的活动类型选项改成中文。

## Release banner / 版本公告

- [ ] Show the production release date and a short update summary in the banner whenever a new version launches.
  每次正式上线新版本时，在 Banner 显示上线日期和简短更新说明。

## Pool rating tags / 泳池评分标签

- [ ] Add `Universal change room` / `无障碍／通用更衣室`.
- [ ] Add `Outdoor pool` / `露天泳池`.
- [ ] Add `Indoor pool` / `室内泳池`.
- [ ] Display these tags in the language currently selected by the user.
  根据用户当前选择的语言显示对应标签。

