#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get version from command line argument
const newVersion = process.argv[2];

if (!newVersion) {
    console.error('Usage: node scripts/bump-version.js <version>');
    console.error('Example: node scripts/bump-version.js 3.5.0');
    process.exit(1);
}

// Validate version format (basic check for X.Y.Z)
if (!/^\d+\.\d+\.\d+/.test(newVersion)) {
    console.error('Invalid version format. Expected format like: 3.5.0');
    process.exit(1);
}

const projectRoot = path.join(__dirname, '..');

// Files to update
const files = {
    packageJson: path.join(projectRoot, 'package.json'),
    manifestJson: path.join(projectRoot, 'public', 'manifest.json'),
    changelog: path.join(projectRoot, 'CHANGELOG.md'),
};

try {
    // Update package.json
    console.log(`📦 Updating package.json to version ${newVersion}...`);
    const packageJsonContent = JSON.parse(fs.readFileSync(files.packageJson, 'utf8'));
    packageJsonContent.version = newVersion;
    fs.writeFileSync(files.packageJson, JSON.stringify(packageJsonContent, null, 2) + '\n');

    // Update manifest.json
    console.log(`📋 Updating manifest.json to version ${newVersion}...`);
    const manifestJsonContent = JSON.parse(fs.readFileSync(files.manifestJson, 'utf8'));
    manifestJsonContent.version = newVersion;
    fs.writeFileSync(files.manifestJson, JSON.stringify(manifestJsonContent, null, 2) + '\n');

    // Update CHANGELOG.md
    console.log(`📝 Updating CHANGELOG.md with new version entry...`);
    const changelogContent = fs.readFileSync(files.changelog, 'utf8');
    const changelogLines = changelogContent.split('\n');
    const changelogTitleIndex = changelogLines.findIndex(line => line === '# Changelog');

    if (changelogTitleIndex === -1) {
        throw new Error('Could not find "# Changelog" in CHANGELOG.md');
    }

    const nextVersionIndex = changelogLines.findIndex(
        (line, idx) => idx > changelogTitleIndex && line.trim() === '## Next Version'
    );

    if (nextVersionIndex === -1) {
        throw new Error('Could not find "## Next Version" in CHANGELOG.md');
    }

    const nextVersionEndIndex = changelogLines.findIndex(
        (line, idx) => idx > nextVersionIndex && line.startsWith('## ')
    );
    const nextVersionBlockEnd = nextVersionEndIndex === -1 ? changelogLines.length : nextVersionEndIndex;

    const updatedHeadingIndex = changelogLines.findIndex(
        (line, idx) => idx > nextVersionIndex && idx < nextVersionBlockEnd && line.trim() === '### Updated'
    );

    if (updatedHeadingIndex === -1) {
        throw new Error('Could not find "### Updated" under "## Next Version" in CHANGELOG.md');
    }

    let updatedSectionEnd = nextVersionBlockEnd;
    for (let i = updatedHeadingIndex + 1; i < nextVersionBlockEnd; i += 1) {
        const currentLine = changelogLines[i];
        if (currentLine.startsWith('### ') || currentLine.startsWith('## ')) {
            updatedSectionEnd = i;
            break;
        }
    }

    const updatedSectionLines = changelogLines.slice(updatedHeadingIndex + 1, updatedSectionEnd);
    const hasUpdateItems = updatedSectionLines.some(line => line.trim() !== '' && line.trim() !== '- none');
    const newVersionUpdatedLines = hasUpdateItems ? updatedSectionLines : ['- none'];

    const placeholderUpdatedSection = ['### Updated', '', '- none\n'];

    const nextVersionBlockBeforeUpdated = changelogLines.slice(nextVersionIndex, updatedHeadingIndex);
    const nextVersionBlockAfterUpdated = changelogLines.slice(updatedSectionEnd, nextVersionBlockEnd);
    const updatedNextVersionBlock = [...nextVersionBlockBeforeUpdated, ...placeholderUpdatedSection, ...nextVersionBlockAfterUpdated];

    const newVersionSection = [
        // '',
        `## v${newVersion}`,
        // '',
        ...newVersionUpdatedLines,
        // '',
    ];

    const beforeNextVersion = changelogLines.slice(0, nextVersionIndex);
    const afterNextVersion = changelogLines.slice(nextVersionBlockEnd);
    const updatedChangelogLines = [...beforeNextVersion, ...updatedNextVersionBlock, ...newVersionSection, ...afterNextVersion];

    fs.writeFileSync(files.changelog, updatedChangelogLines.join('\n'));
    // Commit the changes
    console.log(`📝 Committing changes...`);
    const { execSync, exec } = require('child_process');
    try {
        execSync('git add .', { stdio: 'inherit' });
        execSync(`git commit -m "Release v${newVersion}"`, { stdio: 'inherit' });
        console.log(`✅ Committed with message: "Release v${newVersion}"`);
        execSync(`git tag v${newVersion}`, { stdio: 'inherit' });
        console.log(`✅ Tagged with: v${newVersion}`);
        execSync('git push', { stdio: 'inherit' });
    } catch (error) {
        console.error('❌ Git commit failed:', error.message);
        process.exit(1);
    }
    console.log(`\n✅ Version bumped to ${newVersion}\n`);
    console.log('Files updated:');
    console.log(`  - package.json`);
    console.log(`  - public/manifest.json`);
    console.log(`  - CHANGELOG.md`);
    console.log(`  - Committed to git with message: "Release v${newVersion}"`);
    console.log(`  - Tagged with: v${newVersion}`);
    // console.log('\n💡 Next steps:');
    // console.log('  1. Push the commit: git push');
    // console.log('  2. Create a release/tag if needed');
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}
