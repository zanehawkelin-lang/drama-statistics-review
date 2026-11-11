from pathlib import Path

root = Path(__file__).resolve().parent
markup = (root / 'index.html').read_text(encoding='utf-8')
css = (root / 'styles.css').read_text(encoding='utf-8')
markup = markup.replace('<link rel="stylesheet" href="styles.css">', '<style>\n' + css + '\n</style>')
for name in ('model.js', 'page-scopes.js', 'app.js'):
    script = (root / name).read_text(encoding='utf-8').replace('</script', '<\\/script')
    markup = markup.replace('<script src="' + name + '"></script>', '<script>\n' + script + '\n</script>')
target = root / 'dist' / 'index.html'
target.parent.mkdir(exist_ok=True)
target.write_text(markup, encoding='utf-8')
print(f'Static entry ready: {target} ({target.stat().st_size:,} bytes)')
