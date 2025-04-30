import { FlatCompat } from '@eslint/eslintrc';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname
});

const eslintConfig = [
  ...compat.extends(
    'next/core-web-vitals',
    compat.config({
      extends: ['next/typescript'],
      rules: {
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            argsIgnorePattern: '^_'
          }
        ],
        'react/react-in-jsx-scope': 'off',
        'react/jsx-uses-react': 'off',
        'react/jsx-uses-vars': ['error'],
        'import/no-anonymous-default-export': [
          'error',
          {
            allowArray: true,
            allowArrowFunction: true,
            allowAnonymousClass: true,
            allowAnonymousFunction: true,
            allowCallExpression: true,
            allowLiteral: true,
            allowObject: true
          }
        ]
      }
    })
  )
];

export default eslintConfig;
