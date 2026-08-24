import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier/flat'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      prettier,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      /*
       * 색은 src/app/theme.ts 에서만 정의한다.
       * 컴포넌트에서는 theme.useToken() 으로 읽거나 theme.ts 가 export 한 상수를 쓴다.
       * 화면마다 색을 직접 박으면 테마를 바꿔도 거기만 안 따라온다.
       */
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='style'] Literal[value=/#[0-9a-fA-F]{3,8}/]",
          message:
            '색상 리터럴 대신 theme.useToken() 이나 @/app/theme 의 상수를 쓰세요 (src/app/theme.ts).',
        },
      ],
    },
  },
])
