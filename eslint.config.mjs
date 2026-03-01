// ============================================
// ESLint 配置文件 (Flat Config 格式)
// ============================================
// ESLint 是一个代码检查工具，用于发现和修复 JavaScript/TypeScript 代码中的问题

// 导入 ESLint 的配置定义函数
import { defineConfig } from 'eslint/config'

// 导入 Electron Toolkit 提供的 TypeScript ESLint 配置
// 这个配置包含了针对 TypeScript 的推荐规则
import tseslint from '@electron-toolkit/eslint-config-ts'

// 导入 Prettier 配置，用于关闭与 Prettier 冲突的 ESLint 规则
// Prettier 负责代码格式化，ESLint 负责代码质量检查，两者需要协同工作
import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier'

// 导入 Vue 的 ESLint 插件，提供 Vue 特定的检查规则
import eslintPluginVue from 'eslint-plugin-vue'

// 导入 Vue 文件解析器，用于解析 .vue 单文件组件
import vueParser from 'vue-eslint-parser'

// 导出 ESLint 配置
// defineConfig 接受多个配置对象，它们会按顺序合并
export default defineConfig(
  // ============================================
  // 配置 1: 忽略文件
  // ============================================
  // 指定哪些文件/目录不需要进行 ESLint 检查
  {
    ignores: [
      '**/node_modules', // 忽略所有 node_modules 目录（第三方依赖）
      '**/dist', // 忽略构建输出目录
      '**/out' // 忽略其他输出目录
    ]
  },

  // ============================================
  // 配置 2: TypeScript 推荐规则
  // ============================================
  // 应用 Electron Toolkit 提供的 TypeScript 推荐配置
  // 包含类型检查、命名规范等 TypeScript 最佳实践
  tseslint.configs.recommended,

  // ============================================
  // 配置 3: Vue 推荐规则
  // ============================================
  // 应用 Vue 官方推荐的 ESLint 规则（Flat Config 格式）
  // 包含 Vue 模板语法、组件规范等检查
  eslintPluginVue.configs['flat/recommended'],

  // ============================================
  // 配置 4: Vue 文件的解析器配置
  // ============================================
  {
    // 仅对 .vue 文件应用此配置
    files: ['**/*.vue'],

    // 语言选项配置
    languageOptions: {
      // 使用 vue-eslint-parser 作为主解析器
      // 它能够解析 Vue 单文件组件的 <template>、<script>、<style> 三个部分
      parser: vueParser,

      // 解析器选项
      parserOptions: {
        // 启用 ECMAScript 特性
        ecmaFeatures: {
          jsx: true // 允许在 Vue 文件中使用 JSX 语法
        },

        // 指定额外的文件扩展名
        extraFileExtensions: ['.vue'],

        // 指定 <script> 标签内容的解析器
        // 使用 TypeScript 解析器来解析 Vue 文件中的 <script> 部分
        parser: tseslint.parser
      }
    }
  },

  // ============================================
  // 配置 5: 自定义规则
  // ============================================
  {
    // 对 TypeScript 和 Vue 文件应用以下规则
    files: ['**/*.{ts,mts,tsx,vue}'],

    // 规则配置
    rules: {
      // 禁止使用 any 类型
      // 'error' 表示使用 any 会报错
      // 原因: any 会绕过类型检查，失去 TypeScript 的类型安全保护
      // 建议: 使用 unknown、具体类型或泛型代替
      '@typescript-eslint/no-explicit-any': 'error',

      // 禁止使用类型断言（as）来绕过类型检查
      // 'error' 表示不当使用类型断言会报错
      // 允许: as const（常量断言）
      // 禁止: as any, as string 等用于绕过类型检查的断言
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        {
          assertionStyle: 'as', // 允许使用 as 语法
          objectLiteralTypeAssertions: 'never' // 禁止对象字面量使用类型断言
        }
      ],

      // 关闭"必须为 props 提供默认值"的规则
      // 'off' 表示禁用此规则
      // 原因: 在 TypeScript 中，类型系统已经能够保证类型安全，不一定需要默认值
      'vue/require-default-prop': 'off',

      // 强制组件名必须是多个单词（推荐开启）
      // 'warn' 表示违反时给出警告（不会阻止运行）
      // 原因: 避免与 HTML 原生标签冲突，提高代码可读性
      // 例如: 使用 UserCard 而不是 Card，使用 AppButton 而不是 Button
      'vue/multi-word-component-names': 'warn',

      // 强制 Vue 文件的 <script> 标签必须使用 TypeScript
      // 'error' 表示违反此规则会报错
      'vue/block-lang': [
        'error', // 违反规则时的错误级别
        {
          script: {
            lang: 'ts' // 要求 <script> 标签必须写成 <script lang="ts">
          }
        }
      ]
    }
  },

  // ============================================
  // 配置 6: Prettier 兼容配置
  // ============================================
  // 必须放在最后，用于关闭所有与 Prettier 冲突的 ESLint 规则
  // 这样 Prettier 可以专注于代码格式化，ESLint 专注于代码质量
  eslintConfigPrettier
)
