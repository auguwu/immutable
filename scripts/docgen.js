/**
 * Copyright (c) 2019-2021 August
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const { existsSync } = require('fs');
const { version } = require('../package.json');
const { join } = require('path');
const typedoc = require('typedoc');
const { execSync } = require('child_process');

const log = (message) => process.stdout.write(`[docs] ${message}\n`);

const commitHash = execSync('git rev-parse HEAD', { cwd: join(__dirname, '..') }).toString().trim() ?? 'master';

async function generate() {
  log('initalising typedoc...');
  const app = new typedoc.Application();
  app.options.addReader(new typedoc.TSConfigReader());
  app.options.addReader(new typedoc.TypeDocReader());

  app.bootstrap({
    entryPoints: ['src'],
    excludePrivate: true,
    excludeProtected: true
  });

  log('bootstrapped project, now getting reflections');
  const project = app.convert();
  if (project) {
    log('received reflections, now outputing it to scripts/generated/docs.json');

    const outputDir = join(__dirname, 'generated');
    await app.generateJson(project, join(outputDir, 'docs.json'));
  }
}

async function main() {
  if (!existsSync(join(__dirname, 'generated', 'docs.json'))) await generate();

  log('now reading contents...');
  const docs = require(join(__dirname, 'generated', 'docs.json'));
  let elements = [];

  const starting = [
    '-- DO NOT EDIT THIS FILE YOURSELF, THIS IS AUTO-GENERATED --',
    '',
    `Library Version: ${version}`,
    `Updated At: ${new Date().toLocaleString()}`
  ];

  log(`loaded documentation for ${docs.name} and received ${docs.children.length} children to read from`);
  for (let i = 0; i < docs.children.length; i++) {
    const parent = docs.children[i];
    const E = read(parent, elements);

    elements = elements.concat(E);
  }

  log(`received ${elements.length} elements! now formatting...`);
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    //console.log(element);
  }
}

function read(child, all) {
  const elements = [];

  if (child.children && child.children.length > 0) {
    for (let i = 0; i < child.children.length; i++) {
      const c = child.children[i];
      const element = readChild(c, child, undefined, all);

      elements.push(element);
    }
  }

  return elements;
}

function readChild(child, parent, els = undefined, all = []) {
  const elements = els ? els : {
    parent: parent ? { kind: parent.kindString, name: parent.name } : null,
    comment: null,
    name: null
  };

  switch (child.kindString) {
    case 'Class': {
      elements.kind = 'Class';

      if (child.comment !== undefined) elements.comment = child.comment.shortText.trim();
      if (child.name !== undefined) elements.name = child.name === 'default' ? elements.parent?.name ?? 'default' : child.name;
      if (child.typeParameter !== undefined) {
        if (!elements.generics) elements.generics = [];

        for (let i = 0; i < child.typeParameter.length; i++) {
          const generic = child.typeParameter[i];
          elements.generics.push({
            name: generic.name,
            comment: generic.comment?.shortText.trim() ?? ''
          });
        }
      }

      if (child.sources !== undefined) {
        elements.sources = child.sources.map(e => ({
          path: e.fileName,
          github: `https://github.com/auguwu/collections/blob/${commitHash}/${e.fileName}`,
          line: e.line,
          character: e.character
        }));
      }

      if (child.extendedTypes !== undefined) {
        if (!elements.extends) elements.extends = [];
        for (let i = 0; i < child.extendedTypes.length; i++) {
          const type = child.extendedTypes[i];
          let name = type.name;

          if (type.typeArguments !== undefined) {
            name += '<';
            const args = [];

            for (let i = 0; i < type.typeArguments.length; i++) {
              const argument = type.typeArguments[i];
              args.push(argument.name);
            }

            name += `${args.join(', ')}>`;
            elements.extends.push(name);
          }
        }
      }

      if (child.children && child.children.length > 0) {
        if (!elements.children) elements.children = [];

        for (let i = 0; i < child.children.length; i++) {
          const c = child.children[i];
          const element = readChild(c, child, elements, all);

          elements.children.push(element);
        }
      }
    } break;

    case 'Variable': {
      elements.kind = 'Variable';

      if (child.name !== undefined) elements.name = child.name;
      if (child.flags !== undefined && child.flags.isConst !== undefined) elements.constant = child.flags.isConst;
      if (child.comment !== undefined) elements.comment = child.comment.shortText.trim() ?? '';
      if (child.type !== undefined) elements.type = child.type.name;
      if (child.sources !== undefined) {
        elements.sources = child.sources.map(e => ({
          path: e.fileName,
          github: `https://github.com/auguwu/collections/blob/${commitHash}/${e.fileName}${e.line !== undefined ? `#L${e.line}` : ''}`,
          line: e.line,
          character: e.character
        }));
      }
    } break;

    case 'Type alias': {
      elements.kind = 'Type Alias';
      if (child.name !== undefined) elements.name = child.name;
      if (child.comment !== undefined) elements.comment = child.comment.shortText.trim() ?? '';
      if (child.sources !== undefined) {
        elements.sources = child.sources.map(e => ({
          path: e.fileName,
          github: `https://github.com/auguwu/collections/blob/${commitHash}/${e.fileName}${e.line !== undefined ? `#L${e.line}` : ''}`,
          line: e.line,
          character: e.character
        }));
      }

      if (child.typeParameter !== undefined) {
        if (!elements.generics) elements.generics = [];

        for (let i = 0; i < child.typeParameter.length; i++) {
          const generic = child.typeParameter[i];
          elements.generics.push({
            name: generic.name,
            comment: generic.comment?.shortText.trim() ?? ''
          });
        }
      }

      if (child.type !== undefined) elements.type = typeToString(child.type);
    } break;

    case 'Interface': {
      elements.kind = 'Interface';

      if (child.name !== undefined) elements.name = child.name;
      if (child.comment !== undefined) elements.comment = child.comment.shortText.trim() ?? '';
      if (child.sources !== undefined) {
        elements.sources = child.sources.map(e => ({
          path: e.fileName,
          github: `https://github.com/auguwu/collections/blob/${commitHash}/${e.fileName}${e.line !== undefined ? `#L${e.line}` : ''}`,
          line: e.line,
          character: e.character
        }));
      }

      if (child.children && child.children.length > 0) {
        if (!elements.children) elements.children = [];

        for (let i = 0; i < child.children.length; i++) {
          const c = child.children[i];
          const element = readChild(c, child, elements, all);

          elements.children.push(element);
        }
      }
    } break;

    case 'Constructor': {
      // don't do anything if the parent is a module
      if (elements.parent && elements.parent.name === 'Module') break;

      elements.kind = 'Constructor';
      if (child.name !== undefined) elements.name = child.name;
      if (child.signatures !== undefined) {
        if (!elements.signatures) elements.signatures = [];

        for (let i = 0; i < child.signatures.length; i++) {
          const signature = child.signatures[i];

          const el = {};
          el.kind = 'Constructor Signature';
          if (signature.name !== undefined) el.name = signature.name;
          if (signature.comment !== undefined) el.comment = signature.comment.shortText?.trim() ?? '';
          if (signature.parameters !== undefined) {
            if (!el.parameters) el.parameters = [];

            for (let p = 0; p < signature.parameters.length; p++) {
              const param = signature.parameters[p];
              const block = {};

              if (param.name !== undefined) block.name = param.name;
              if (param.comment !== undefined) block.comment = param.comment.shortText?.trim() ?? '';
              if (param.flags !== undefined) {
                block.optional = param.flags.isOptional !== undefined;
              }

              if (param.type !== undefined) block.type = typeToString(param.type);
              el.parameters.push(block);
            }
          }

          elements.signatures.push(el);
        }
      }

      if (child.type !== undefined) elements.type = typeToString(child.type);
    } break;

    case 'Method': {
      // don't do anything if the parent is a module
      if (elements.parent && elements.parent.name === 'Module') break;

      elements.kind = 'Method';
      if (child.name !== undefined) elements.name = child.name;
      if (child.comment !== undefined) elements.comment = child.comment.shortText.trim() ?? '';
      if (child.sources !== undefined) {
        elements.sources = child.sources.map(e => ({
          path: e.fileName,
          github: `https://github.com/auguwu/collections/blob/${commitHash}/${e.fileName}${e.line !== undefined ? `#L${e.line}` : ''}`,
          line: e.line,
          character: e.character
        }));
      }

      if (child.signatures !== undefined) {
        if (!elements.signatures) elements.signatures = [];

        for (let i = 0; i < child.signatures.length; i++) {
          const signature = child.signatures[i];

          const el = {};
          el.kind = 'Method Signature';
          if (signature.name !== undefined) el.name = signature.name;
          if (signature.comment !== undefined) el.comment = signature.comment.shortText?.trim() ?? '';
          if (signature.parameters !== undefined) {
            if (!el.parameters) el.parameters = [];

            for (let p = 0; p < signature.parameters.length; p++) {
              const param = signature.parameters[p];
              const block = {};

              if (param.name !== undefined) block.name = param.name;
              if (param.comment !== undefined) block.comment = param.comment.shortText?.trim() ?? '';
              if (param.flags !== undefined) {
                block.optional = param.flags.isOptional !== undefined;
              }

              if (param.type !== undefined) block.type = typeToString(param.type);
              el.parameters.push(block);
            }
          }

          elements.signatures.push(el);
        }
      }
    } break;

    case 'Accessor': {
      // don't do anything if the parent is a module
      if (elements.parent && elements.parent.name === 'Module') break;

      elements.kind = 'Accessor';
      if (child.name !== undefined) elements.name = child.name;
      if (child.comment !== undefined) elements.comment = child.comment.shortText.trim() ?? '';
      if (child.sources !== undefined) {
        elements.sources = child.sources.map(e => ({
          path: e.fileName,
          github: `https://github.com/auguwu/collections/blob/${commitHash}/${e.fileName}${e.line !== undefined ? `#L${e.line}` : ''}`,
          line: e.line,
          character: e.character
        }));
      }

      if (child.getSignatures !== undefined) {
        if (!elements.signatures) elements.signatures = [];

        for (let i = 0; i < child.getSignatures.length; i++) {
          const signature = child.getSignatures[i];

          const el = {};
          el.kind = 'Getter Signature';
          el.getter = true;
          el.setter = false;

          if (signature.name !== undefined) el.name = signature.name;
          if (signature.comment !== undefined) el.comment = signature.comment.shortText?.trim() ?? '';
          if (signature.type !== undefined) el.type = typeToString(signature.type);

          elements.signatures.push(el);
        }
      }

      if (child.setSignatures !== undefined) {
        for (let i = 0; i < child.setSignatures.length; i++) {
          const signature = child.setSignatures[i];

          const el = {};
          el.kind = 'Setter Signature';
          el.getter = false;
          el.setter = true;

          if (signature.name !== undefined) el.name = signature.name;
          if (signature.comment !== undefined) el.comment = signature.comment.shortText?.trim() ?? '';
          if (signature.type !== undefined) el.type = typeToString(signature.type);

          elements.signatures.push(el);
        }
      }
    } break;

    case 'Function': {
      elements.type = 'Function';
      if (child.name !== undefined) elements.name = child.name;
      if (child.comment !== undefined) elements.comment = child.comment.shortText.trim() ?? '';
      if (child.sources !== undefined) {
        elements.sources = child.sources.map(e => ({
          path: e.fileName,
          github: `https://github.com/auguwu/collections/blob/${commitHash}/${e.fileName}${e.line !== undefined ? `#L${e.line}` : ''}`,
          line: e.line,
          character: e.character
        }));
      }

      if (child.signatures !== undefined) {
        if (!elements.signatures) elements.signatures = [];

        for (let i = 0; i < child.signatures.length; i++) {
          const signature = child.signatures[i];

          const el = {};
          el.kind = 'Function Signature';
          if (signature.name !== undefined) el.name = signature.name;
          if (signature.comment !== undefined) el.comment = signature.comment.shortText?.trim() ?? '';
          if (signature.parameters !== undefined) {
            if (!el.parameters) el.parameters = [];

            for (let p = 0; p < signature.parameters.length; p++) {
              const param = signature.parameters[p];
              const block = {};

              if (param.name !== undefined) block.name = param.name;
              if (param.comment !== undefined) block.comment = param.comment.shortText?.trim() ?? '';
              if (param.type !== undefined) block.type = typeToString(param.type);

              el.parameters.push(block);
            }
          }

          elements.signatures.push(el);
        }
      }
    } break;
  }

  return elements;
}

function typeToString(type) {
  return 'unknown';
}

main();