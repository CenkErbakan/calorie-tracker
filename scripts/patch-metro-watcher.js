const fs = require('fs');
const path = require('path');

// Root node_modules (project runs from root)
const watcherPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'metro-file-map',
  'src',
  'watchers',
  'FallbackWatcher.js'
);

if (!fs.existsSync(watcherPath)) {
  process.exit(0);
}

let content = fs.readFileSync(watcherPath, 'utf8');

if (content.includes('} catch (e) {') && content.includes('if (e.code === "ENOENT") return false;')) {
  process.exit(0);
}

const oldBlock = `    const watcher = _fs.default.watch(
      dir,
      {
        persistent: true,
      },
      (event, filename) => this._normalizeChange(dir, event, filename),
    );
    this.watched[dir] = watcher;
    watcher.on("error", this._checkedEmitError);
    if (this.root !== dir) {
      this._register(dir, "d");
    }
    return true;
  };`;

const newBlock = `    try {
      const watcher = _fs.default.watch(
        dir,
        {
          persistent: true,
        },
        (event, filename) => this._normalizeChange(dir, event, filename),
      );
      this.watched[dir] = watcher;
      watcher.on("error", this._checkedEmitError);
      if (this.root !== dir) {
        this._register(dir, "d");
      }
      return true;
    } catch (e) {
      if (e.code === "ENOENT") return false;
      throw e;
    }
  };`;

if (!content.includes(oldBlock)) {
  process.exit(0);
}

content = content.replace(oldBlock, newBlock);
fs.writeFileSync(watcherPath, content);
console.log('patch-metro-watcher: patched FallbackWatcher.js (ENOENT try-catch)');
