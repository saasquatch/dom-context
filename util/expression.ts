import { CucumberExpression, ParameterTypeRegistry } from "cucumber-expressions";

const registry = new ParameterTypeRegistry();
export function e(template:TemplateStringsArray, ...args:unknown[]):RegExp {
  let str = "";
  for (let i = 0; i < args.length; i++) {
    str += template[i] + String(args[i]);
  }
  const out = str + template[template.length - 1];

  const regexp = new CucumberExpression(out, registry).regexp;
  console.log("Regenerated REGECP", regexp.toString());
  return regexp;
}
