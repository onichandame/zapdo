#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';

class SkillValidator {
  constructor(skillPath) {
    this.skillPath = skillPath;
    this.result = {
      valid: true,
      errors: [],
      warnings: []
    };
  }

  async validate() {
    console.log(`🔍 Validating skill: ${this.skillPath}\n`);

    await this.validateStructure();
    await this.validateFrontmatter();
    await this.validateContent();
    await this.validateReferences();
    await this.validateScripts();

    this.printResults();
    return this.result;
  }

  async validateStructure() {
    console.log('📁 Checking directory structure...');

    const requiredFiles = ['SKILL.md'];
    const requiredDirs = ['references', 'scripts', 'assets'];

    for (const file of requiredFiles) {
      const filePath = path.join(this.skillPath, file);
      try {
        await fs.access(filePath);
        console.log(`  ✅ ${file}`);
      } catch {
        this.result.errors.push(`Missing required file: ${file}`);
        console.log(`  ❌ ${file}`);
      }
    }

    for (const dir of requiredDirs) {
      const dirPath = path.join(this.skillPath, dir);
      try {
        const stat = await fs.stat(dirPath);
        if (stat.isDirectory()) {
          console.log(`  ✅ ${dir}/`);
        } else {
          this.result.errors.push(`Expected directory but found file: ${dir}`);
          console.log(`  ❌ ${dir}/`);
        }
      } catch {
        this.result.errors.push(`Missing required directory: ${dir}`);
        console.log(`  ❌ ${dir}/`);
      }
    }
  }

  async validateFrontmatter() {
    console.log('\n📝 Validating frontmatter...');

    const skillFile = path.join(this.skillPath, 'SKILL.md');
    try {
      const content = await fs.readFile(skillFile, 'utf-8');
      
      const frontmatterMatch = content.match(/^---\n(.*?)\n---/s);
      if (!frontmatterMatch) {
        this.result.errors.push('No frontmatter found in SKILL.md');
        return;
      }

      const frontmatterText = frontmatterMatch[1];
      
      const parseFrontmatter = (text) => {
        const frontmatter = {};
        const lines = text.split('\n');
        for (const line of lines) {
          const match = line.match(/^(\w+):\s*(.+)$/);
          if (match) {
            frontmatter[match[1]] = match[2].replace(/^["']|["']$/g, '');
          }
        }
        return frontmatter;
      };

      const frontmatter = parseFrontmatter(frontmatterText);

      const requiredFields = ['name', 'description', 'license', 'scope'];
      for (const field of requiredFields) {
        if (!frontmatter[field]) {
          this.result.errors.push(`Missing required frontmatter field: ${field}`);
          console.log(`  ❌ ${field}`);
        } else {
          console.log(`  ✅ ${field}`);
        }
      }

      if (frontmatter.name && frontmatter.name !== 'serverless-testing-strategy') {
        this.result.errors.push(`Skill name must match directory: serverless-testing-strategy`);
        console.log(`  ❌ name mismatch`);
      }

      if (frontmatter.description) {
        const descLength = frontmatter.description.length;
        if (descLength < 20 || descLength > 1024) {
          this.result.errors.push(`Description must be 20-1024 characters (got ${descLength})`);
          console.log(`  ❌ description length`);
        } else {
          console.log(`  ✅ description length (${descLength} chars)`);
        }
      }

      if (frontmatter.scope && !['project', 'global'].includes(frontmatter.scope)) {
        this.result.errors.push(`Scope must be 'project' or 'global'`);
        console.log(`  ❌ scope value`);
      }

    } catch (error) {
      this.result.errors.push(`Failed to parse frontmatter: ${error.message}`);
    }
  }

  async validateContent() {
    console.log('\n📖 Validating content structure...');

    const skillFile = path.join(this.skillPath, 'SKILL.md');
    try {
      const content = await fs.readFile(skillFile, 'utf-8');
      const bodyContent = content.replace(/^---\n.*?\n---\n/s, '');

      const requiredSections = [
        '# Serverless Testing Strategy',
        '## When to use this skill',
        '## Instructions',
        '## Progressive Testing Strategy',
        '## Advanced Patterns',
        '## CI/CD Integration',
        '## Quality Metrics',
        '## Best Practices'
      ];

      for (const section of requiredSections) {
        if (bodyContent.includes(section)) {
          console.log(`  ✅ ${section}`);
        } else {
          if (section.startsWith('# ')) {
            this.result.errors.push(`Missing main section: ${section}`);
          } else {
            this.result.warnings.push(`Missing section: ${section}`);
          }
          console.log(`  ❌ ${section}`);
        }
      }

      const references = bodyContent.match(/\[([^\]]+)\]\(references\/([^)]+)\)/g) || [];
      if (references.length > 0) {
        console.log(`  ✅ Progressive loading references (${references.length})`);
        for (const ref of references) {
          console.log(`    📎 ${ref}`);
        }
      } else {
        this.result.warnings.push('No progressive loading references found');
      }

      const wordCount = bodyContent.split(/\s+/).length;
      if (wordCount > 5000) {
        this.result.warnings.push(`SKILL.md is quite long (${wordCount} words). Consider moving detailed content to reference files.`);
        console.log(`  ⚠️  content length (${wordCount} words)`);
      } else {
        console.log(`  ✅ content length (${wordCount} words)`);
      }

    } catch (error) {
      this.result.errors.push(`Failed to validate content: ${error.message}`);
    }
  }

  async validateReferences() {
    console.log('\n📚 Validating reference files...');

    const refsDir = path.join(this.skillPath, 'references');
    try {
      const referenceFiles = await fs.readdir(refsDir);
      
      const expectedFiles = [
        'vitest-config.md',
        'playwright-config.md',
        'database-testing.md',
        'mocking-patterns.md',
        'troubleshooting.md',
        'cicd-pipeline.md'
      ];

      for (const expectedFile of expectedFiles) {
        const filePath = path.join(refsDir, expectedFile);
        try {
          await fs.access(filePath);
          const stats = await fs.stat(filePath);
          const sizeKB = Math.round(stats.size / 1024);
          console.log(`  ✅ ${expectedFile} (${sizeKB}KB)`);
        } catch {
          this.result.warnings.push(`Optional reference file missing: ${expectedFile}`);
          console.log(`  ⚠️  ${expectedFile} (missing)`);
        }
      }

      for (const file of referenceFiles) {
        if (!file.endsWith('.md') || file === 'README.md') continue;
        
        const filePath = path.join(refsDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        
        const hasHeaders = /^#+\s+/m.test(content);
        if (hasHeaders) {
          this.result.warnings.push(`Reference file ${file} has headers - good for navigation`);
        }

        const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
        if (codeBlocks.length > 0) {
          console.log(`    💻 ${file}: ${codeBlocks.length} code blocks`);
        }
      }

    } catch (error) {
      this.result.warnings.push(`Could not validate references directory: ${error.message}`);
    }
  }

  async validateScripts() {
    console.log('\n🔧 Validating scripts...');

    const scriptsDir = path.join(this.skillPath, 'scripts');
    try {
      const scriptFiles = await fs.readdir(scriptsDir);
      
      for (const file of scriptFiles) {
        if (!file.endsWith('.js') && !file.endsWith('.ts')) continue;
        
        const filePath = path.join(scriptsDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        
        if (file.endsWith('.js')) {
          try {
            new Function(content);
            console.log(`  ✅ ${file} (valid JavaScript)`);
          } catch (error) {
            this.result.errors.push(`Script ${file} has syntax errors: ${error.message}`);
            console.log(`  ❌ ${file} (syntax error)`);
          }
        }
      }

      if (scriptFiles.length === 0) {
        console.log(`  ℹ️  No scripts found (optional)`);
      }

    } catch (error) {
      this.result.warnings.push(`Could not validate scripts directory: ${error.message}`);
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 VALIDATION RESULTS');
    console.log('='.repeat(50));

    if (this.result.errors.length === 0 && this.result.warnings.length === 0) {
      console.log('🎉 All checks passed! Skill is ready to use.\n');
      console.log('🚀 Next steps:');
      console.log('   1. Test the skill with: opencode skill serverless-testing-strategy');
      console.log('   2. Verify it triggers correctly in test scenarios');
      console.log('   3. Update agent configurations if needed');
    } else {
      if (this.result.errors.length > 0) {
        console.log('❌ ERRORS (must be fixed):');
        this.result.errors.forEach(error => {
          console.log(`   • ${error}`);
        });
        this.result.valid = false;
      }

      if (this.result.warnings.length > 0) {
        console.log('\n⚠️  WARNINGS (recommendations):');
        this.result.warnings.forEach(warning => {
          console.log(`   • ${warning}`);
        });
      }
    }

    console.log('\n' + '='.repeat(50));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const skillPath = process.argv[2] || './serverless-testing-strategy';
  const validator = new SkillValidator(skillPath);
  
  validator.validate()
    .then((result) => {
      process.exit(result.valid ? 0 : 1);
    })
    .catch((error) => {
      console.error('Validation failed:', error);
      process.exit(1);
    });
}

export { SkillValidator as default };