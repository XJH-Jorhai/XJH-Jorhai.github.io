export const journal = {
  introduction: '把想法做成实物，也把过程留在这里。',
  description: '这里是 FIELDNOTES，一个关于研究、制作与观察的个人博客。从电路板上的一条走线，到屏幕里的一次交互，记录那些值得多看一眼的细节。',
  about: '我喜欢在硬件、代码与视觉之间来回探索：把抽象的问题拆开，做一个小小的原型，再慢慢理解它。这里既收纳作品，也留给尚未成形的想法。',
};

export interface JournalNote { id: string; category: string; title: string; summary: string; outline: string; }
// Editorial placeholders, not published articles or claims of completed research.
export const journalNotes: JournalNote[] = [
  {id:'first-prototype',category:'MAKING / 制作',title:'从一个问题，到第一个原型',summary:'在画第一张原理图之前，先想清楚：这个小东西究竟要回答什么问题？',outline:'计划从需求、草图和最小可行实验三个角度展开，记录如何缩小问题、选择起点，以及为下一次迭代留下空间。案例与过程照片待补充。'},
  {id:'analog-thinking',category:'RESEARCH / 研究',title:'用电路思考计算',summary:'把公式放回电压与时间里，重新观察模拟计算的直觉与边界。',outline:'计划整理运算放大器、积分与反馈的学习笔记，并结合现有模拟计算项目补充图示。电路分析与测量记录待整理，不预设实验结论。'},
  {id:'quiet-interfaces',category:'DESIGN / 设计',title:'让界面安静一点',summary:'关于留白、字体与动效的一些想法：让内容先被看见，让交互恰好发生。',outline:'计划以这个博客为例，整理标题尺度、阅读节奏和轻微空间动效之间的关系。设计对照与取舍说明待补充。'},
  {id:'workbench-log',category:'OBSERVATIONS / 观察',title:'工作台边的零碎记录',summary:'一个暂时没解决的问题、一段有用的代码，以及下一次想试试的事。',outline:'这里预留给短笔记：调试时的发现、工具使用心得和未完成的想法。后续将替换为真实记录，保留问题产生时的上下文。'},
];
