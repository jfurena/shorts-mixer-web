import re
lines = open('server.ts', encoding='utf-8').read().splitlines()
out = []
for line in lines:
    if line.endswith('})'):
        prefix = line[:-2]
        if prefix == '':
            out.append('')
        elif prefix.isspace():
            out.append(prefix + '}')
        else:
            if prefix.endswith('${transcript'):
                out.append(prefix + '}')
            else:
                out.append(prefix)
    else:
        out.append(line)
with open('server.ts', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
