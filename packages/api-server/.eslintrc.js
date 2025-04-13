const fs = require('fs')
// import fs from 'fs'
// import prettierOptons from './.prettierrc'

const prettierOptions = JSON.parse(fs.readFileSync('./.prettierrc.json', 'utf8'))

module.exports = {
	// parser: 'babel-eslint',
	parserOptions: {
		tsconfigRootDir: __dirname,
		project: './tsconfig.eslint.json',
	},
	extends: [
		'airbnb-base',
		'airbnb-typescript/base',
		'plugin:jest/recommended',
		'plugin:jest/style',
		'plugin:@typescript-eslint/recommended',
		'plugin:import/typescript',
		'prettier',
	],
	env: { es6: true, node: true, 'jest/globals': true, mongo: true, mocha: true },
	rules: {
		'import/extensions': 'off',
		'import/no-extraneous-dependencies': 'off',
		'no-plusplus': 'off',
		'no-await-in-loop': 'off',
		'no-restricted-syntax': ['error', 'ForInStatement', 'LabeledStatement', 'WithStatement'],
		'no-return-await': 'off',
		'prettier/prettier': [2, prettierOptions],
		'no-console': 'warn',
		'func-names': ['warn'],
		quotes: ['error', 'single'],
		semi: ['error', 'never'],
		'import/prefer-default-export': 'off',
		'no-underscore-dangle': 'off',
		'no-unused-vars': ['warn'],
		'no-param-reassign': 'off',
		'max-len': 'off',
		'linebreak-style': 'off',
		'no-nested-ternary': 'off',
		'no-unused-expressions': 'off',
		'import/newline-after-import': 'off',
		'import/order': [
			'error',
			{
				groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
				'newlines-between': 'never',
				alphabetize: { order: 'asc', caseInsensitive: true },
			},
		],
		'@typescript-eslint/no-redundant-type-constituents': 'off',
		'@typescript-eslint/no-var-requires': 'off',
		'@typescript-eslint/no-explicit-any': 'off',
		// ensure consistent array typings
		'@typescript-eslint/array-type': 'error',
		'@typescript-eslint/ban-types': 'off',
		// ban ts-comment except with description
		'@typescript-eslint/ban-ts-comment': [
			'off',
			{
				'ts-expect-error': 'allow-with-description',
				'ts-ignore': 'allow-with-description',
				'ts-nocheck': true,
				'ts-check': false,
			},
		],

		// prefer type imports and exports
		'@typescript-eslint/consistent-type-exports': [
			'error',
			{ fixMixedExportsWithInlineTypeSpecifier: true },
		],
		'@typescript-eslint/consistent-type-imports': ['off', { prefer: 'type-imports' }],

		// enforce consistent order of class members
		'@typescript-eslint/member-ordering': 'error',

		// set up naming convention rules
		'@typescript-eslint/naming-convention': [
			'off',
			// camelCase for everything not otherwise indicated
			{ selector: 'default', format: ['camelCase'] },
			// allow known default exclusions
			{
				selector: 'default',
				filter: { regex: '^(_id|__v)$', match: true },
				format: null,
			},
			// allow variables to be camelCase or UPPER_CASE
			{ selector: 'variable', format: ['camelCase', 'UPPER_CASE'] },
			// allow known variable exclusions
			{
				selector: 'variable',
				filter: { regex: '^(_id|__v)$', match: true },
				format: null,
			},
			{
				// variables ending in Service should be PascalCase
				selector: 'variable',
				filter: { regex: '^.*Service$', match: true },
				format: ['PascalCase'],
			},
			// do not enforce format on property names
			{ selector: 'property', format: null },
			// PascalCase for classes and TypeScript keywords
			{
				selector: ['typeLike'],
				format: ['PascalCase'],
			},
		],

		// ensure unused variables are treated as an error
		// overrides @typescript-eslint/recommended -- '@typescript-eslint/no-unused-vars': 'warn'
		// https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/src/configs/recommended.ts
		'@typescript-eslint/no-unused-vars': 'warn',
		'@typescript-eslint/explicit-module-boundary-types': 'off',
	},
	overrides: [
		{
			files: ['**/*.ts'],
			extends: ['plugin:@typescript-eslint/recommended-requiring-type-checking'],
			rules: {
				'@typescript-eslint/ban-ts-comment': 'off',
				'@typescript-eslint/no-redundant-type-constituents': 'off',
				'import/newline-after-import': 'off',
				'import/order': 'off',
				'@typescript-eslint/no-var-requires': 'off',
				'@typescript-eslint/no-explicit-any': 'off',
				'@typescript-eslint/no-unused-vars': 'warn',
				// disable rules turned on by @typescript-eslint/recommended-requiring-type-checking which are too noisy
				// https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/src/configs/recommended-requiring-type-checking.ts
				'@typescript-eslint/no-unsafe-argument': 'off',
				'@typescript-eslint/no-unsafe-assignment': 'off',
				'@typescript-eslint/no-unsafe-call': 'off',
				'@typescript-eslint/no-unsafe-member-access': 'off',
				'@typescript-eslint/no-unsafe-return': 'off',
				'@typescript-eslint/restrict-template-expressions': 'off',
				'@typescript-eslint/unbound-method': 'off',
				'@typescript-eslint/naming-convention': 'off',
				// force explicit member accessibility modifiers
				'@typescript-eslint/explicit-member-accessibility': [
					'error',
					{ accessibility: 'no-public' },
				],

				// allow empty functions
				'@typescript-eslint/no-empty-function': 'off',
			},
		},

		{
			files: ['**/index.ts'],
			rules: {
				// prefer named exports for certain file types
				'import/prefer-default-export': 'off',
				'import/no-default-export': 'off',
				'@typescript-eslint/naming-convention': 'off',
			},
		},
		{
			files: [
				'**/test/**/*.[jt]s?(x)',
				'**/__tests__/**/*.[jt]s?(x)',
				'**/?(*.)+(spec|test).[jt]s?(x)',
			],
			rules: {
				// allow tests to create multiple classes
				'max-classes-per-file': 'off',
				'@typescript-eslint/naming-convention': 'off',

				// allow side effect constructors
				'no-new': 'off',

				// allow import with CommonJS export
				'import/no-import-module-exports': 'off',

				// allow dev dependencies
				'import/no-extraneous-dependencies': [
					'error',
					{ devDependencies: true, optionalDependencies: false, peerDependencies: false },
				],

				// disallow use of "it" for test blocks
				'jest/consistent-test-it': 'off',
				// 'jest/consistent-test-it': ['error', { fn: 'test', withinDescribe: 'test' }],

				// ensure all tests contain an assertion
				'jest/expect-expect': 'error',

				// no commented out tests
				'jest/no-commented-out-tests': 'error',

				// no duplicate test hooks
				'jest/no-duplicate-hooks': 'error',

				// valid titles
				'jest/valid-title': 'error',

				// expect statements in test blocks
				'jest/no-standalone-expect': 'error',

				// disallow returning from test
				'jest/no-test-return-statement': 'error',

				// disallow truthy and falsy in tests
				'jest/no-restricted-matchers': ['error', { toBeFalsy: null, toBeTruthy: null }],

				// prefer called with
				'jest/prefer-called-with': 'error',

				'jest/no-conditional-expect': 'off',
			},
		},

		{
			files: ['**/test/**/*.ts?(x)', '**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
			rules: {
				// allow explicit any in tests
				'@typescript-eslint/no-explicit-any': 'off',
				'@typescript-eslint/naming-convention': 'off',

				// allow non-null-assertions
				'@typescript-eslint/no-non-null-assertion': 'off',

				// allow empty arrow functions
				'@typescript-eslint/no-empty-function': ['warn', { allow: ['arrowFunctions'] }],
			},
		},
		{
			files: ['**/.*.js', '**/*.js'],
			rules: {
				// allow requires in config files
				'@typescript-eslint/no-var-requires': 'off',
				'@typescript-eslint/naming-convention': 'off',
			},
		},

		{
			files: ['**/*.d.ts'],
			rules: {
				// allow tests to create multiple classes
				'max-classes-per-file': 'off',
				'@typescript-eslint/naming-convention': 'off',
				'lines-between-class-members': 'off',
				'@typescript-eslint/lines-between-class-members': 'off',
				'@typescript-eslint/member-ordering': 'off',
				'@typescript-eslint/ban-types': 'off',
			},
		},
	],
	settings: {
		'import/resolver': {
			alias: {
				map: [
					['@', './src'],
					['@configs', './src/configs'],
					['@pkg', './packages'],
					['@test', '.src/test'],
					['@utils', './src/utils'],
					['@account', './src/services/account-service'],
					['@upload', './src/services/upload-service'],
					['@org', './src/services/org-service'],
					['@gateway', './src/api'],
				],
				extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
			},
		},
	},
	plugins: ['jest', 'prettier', 'mocha'],
	ignorePatterns: [
		'node_modules',
		'dist',
		'coverage',
		// "**/*.d.ts",
		'!.*.js',
		'!.*.cjs',
		'!.*.mjs',
	],
}
