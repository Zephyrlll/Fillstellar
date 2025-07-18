#!/usr/bin/env node

/**
 * このスクリプトはresearch-items.mdからresearchData.tsを生成します
 * 使用方法: node scripts/generate-research-data.js
 */

const fs = require('fs');
const path = require('path');

// ファイルパス
const mdFile = path.join(__dirname, '..', 'research-items.md');
const tsFile = path.join(__dirname, '..', 'js', 'researchData.ts');

// MDファイルを読み込む
function readMdFile() {
  try {
    return fs.readFileSync(mdFile, 'utf8');
  } catch (error) {
    console.error('Error reading research-items.md:', error);
    process.exit(1);
  }
}

// YAMLブロックをパースする簡易関数
function parseYamlBlock(block) {
  const lines = block.trim().split('\n');
  const result = {};
  let currentKey = null;
  let currentArray = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '```yaml' || trimmed === '```') continue;

    // 配列の要素
    if (trimmed.startsWith('- ')) {
      if (currentArray) {
        currentArray.push(trimmed.substring(2).trim());
      } else {
        // 新しいアイテムの開始
        return parseResearchItem(block);
      }
      continue;
    }

    // キー:値のペア
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > 0) {
      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();

      if (value === '') {
        // 配列の開始
        currentArray = [];
        result[key] = currentArray;
        currentKey = key;
      } else {
        // 単純な値
        currentArray = null;
        result[key] = value;
      }
    }
  }

  return result;
}

// 研究アイテムをパースする
function parseResearchItem(block) {
  const lines = block.trim().split('\n');
  const item = {
    id: '',
    name: '',
    description: '',
    category: '',
    icon: '',
    cost: {},
    effects: [],
    requirements: [],
    unlocks: []
  };

  let currentSection = null;
  let indent = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '```yaml' || trimmed === '```') continue;

    // インデントレベルを計算
    const leadingSpaces = line.match(/^(\s*)/)[1].length;

    if (trimmed.startsWith('- id:')) {
      item.id = trimmed.substring(5).trim();
    } else if (leadingSpaces === 2) {
      // トップレベルのプロパティ
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0) {
        const key = trimmed.substring(0, colonIndex).trim();
        const value = trimmed.substring(colonIndex + 1).trim();

        if (value) {
          if (key === 'cost') {
            // コストの処理は次の行で
            currentSection = 'cost';
          } else if (key === 'effects' || key === 'requirements' || key === 'unlocks') {
            currentSection = key;
          } else {
            item[key] = value;
          }
        } else {
          currentSection = key;
        }
      }
    } else if (leadingSpaces >= 4) {
      // ネストされたプロパティ
      if (currentSection === 'cost') {
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex > 0) {
          const key = trimmed.substring(0, colonIndex).trim();
          const value = parseInt(trimmed.substring(colonIndex + 1).trim());
          item.cost[key] = value;
        }
      } else if (currentSection === 'effects') {
        if (trimmed.startsWith('- type:')) {
          const type = trimmed.substring(7).trim();
          item.effects.push({ type, value: null });
        } else if (trimmed.startsWith('value:')) {
          const value = trimmed.substring(6).trim();
          if (item.effects.length > 0) {
            const lastEffect = item.effects[item.effects.length - 1];
            // 数値、文字列、ブール値を適切に変換
            if (value === 'true') {
              lastEffect.value = true;
            } else if (value === 'false') {
              lastEffect.value = false;
            } else if (!isNaN(value)) {
              lastEffect.value = parseFloat(value);
            } else {
              lastEffect.value = value;
            }
          }
        }
      } else if (currentSection === 'requirements' || currentSection === 'unlocks') {
        if (trimmed.startsWith('- ')) {
          item[currentSection].push(trimmed.substring(2).trim());
        }
      }
    }
  }

  return item;
}

// MDファイルをパース
function parseMdFile(content) {
  const categories = [];
  const items = [];

  // セクションを分割
  const sections = content.split(/^##\s+/m);

  for (const section of sections) {
    const lines = section.trim().split('\n');
    const title = lines[0];

    if (title === 'カテゴリ定義') {
      // カテゴリセクションを処理
      const categoryBlocks = section.split(/^###\s+/m).slice(1);
      for (const block of categoryBlocks) {
        const yamlStart = block.indexOf('```yaml');
        const yamlEnd = block.indexOf('```', yamlStart + 7);
        if (yamlStart >= 0 && yamlEnd > yamlStart) {
          const yamlContent = block.substring(yamlStart, yamlEnd + 3);
          const category = parseYamlBlock(yamlContent);
          if (category.category) {
            categories.push({
              id: category.category,
              name: category.name,
              icon: category.icon,
              description: category.description
            });
          }
        }
      }
    } else if (title === '研究項目') {
      // 研究項目セクションを処理
      const itemBlocks = section.split(/^```yaml/m).slice(1);
      for (const block of itemBlocks) {
        const yamlContent = '```yaml\n' + block;
        const item = parseResearchItem(yamlContent);
        if (item.id) {
          items.push(item);
        }
      }
    }
  }

  return { categories, items };
}

// TypeScriptファイルを生成
function generateTsFile(data) {
  const { categories, items } = data;

  const content = `import { ResearchData, ResearchCategory, ResearchItem } from './types/research.js';

// This file is generated from research-items.md
// To add or modify research items, edit research-items.md and regenerate this file

export const researchCategories: ResearchCategory[] = ${JSON.stringify(categories, null, 2)};

export const researchItems: ResearchItem[] = ${JSON.stringify(items, null, 2)};

export const researchData: ResearchData = {
  categories: researchCategories,
  items: researchItems
};`;

  // 生成されたコンテンツを整形
  const formatted = content
    .replace(/"(\w+)":/g, '$1:') // クォートを除去
    .replace(/"/g, "'"); // ダブルクォートをシングルクォートに

  return formatted;
}

// メイン処理
function main() {
  console.log('Generating research data from research-items.md...');
  
  const mdContent = readMdFile();
  const data = parseMdFile(mdContent);
  
  console.log(`Found ${data.categories.length} categories and ${data.items.length} research items`);
  
  const tsContent = generateTsFile(data);
  
  try {
    fs.writeFileSync(tsFile, tsContent, 'utf8');
    console.log('Successfully generated researchData.ts');
  } catch (error) {
    console.error('Error writing researchData.ts:', error);
    process.exit(1);
  }
}

// 実行
main();