// ============================================
// Commitlint 配置文件
// ============================================
// Commitlint 用于规范 Git 提交信息格式，确保提交历史清晰易读

export default {
  // 继承 Conventional Commits 规范
  extends: ['@commitlint/config-conventional'],

  // 自定义规则
  rules: {
    // 提交类型必须是以下之一（使用英文）
    'type-enum': [
      2, // 错误级别：2 = error（必须遵守）
      'always',
      [
        'feat', // 新功能
        'fix', // 修复 bug
        'docs', // 文档变更
        'style', // 代码格式（不影响代码运行的变动）
        'refactor', // 重构（既不是新增功能，也不是修复 bug）
        'perf', // 性能优化
        'test', // 增加测试
        'build', // 构建系统或外部依赖变动
        'ci', // CI 配置文件和脚本变动
        'chore', // 其他不修改 src 或测试文件的变动
        'revert' // 回滚之前的提交
      ]
    ],

    // 提交主题（描述）不能为空
    'subject-empty': [2, 'never'],

    // 提交类型不能为空
    'type-empty': [2, 'never'],

    // 提交主题不能以句号结尾
    'subject-full-stop': [2, 'never', '.'],

    // 提交主题大小写不做限制（支持中文描述）
    'subject-case': [0],

    // 提交信息头部最大长度（0 表示不限制，支持详细的中文描述）
    'header-max-length': [0],

    // 正文每行最大长度（0 表示不限制）
    'body-max-line-length': [0],

    // 脚注每行最大长度（0 表示不限制）
    'footer-max-line-length': [0]
  }
}
