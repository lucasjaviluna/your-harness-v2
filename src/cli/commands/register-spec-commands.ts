import type { Command } from "commander";
import chalk from "chalk";
import { createSpecGenerator } from "../../spec/generator.js";
import { createSpecParser } from "../../spec/parser.js";
import { createSpecValidator } from "../../spec/validator.js";
import type { SpecGenerationTarget } from "../../spec/types.js";
import type { CliContext } from "../cli-context.js";
import { createCliConsole } from "../presentation/cli-io.js";

/** Registra los comandos de parseo, validación y generación desde SDD. */
export const registerSpecCommands = (program: Command, { io }: CliContext): void => {
  const console = createCliConsole(io);
  const specParser = createSpecParser();
  const specValidator = createSpecValidator();
  const specGenerator = createSpecGenerator();
  const specCommand = program.command("spec").description("Manage specifications (SDD/OpenSpec)");

  specCommand
    .command("parse <file>")
    .description("Parse a specification file")
    .action((file: string) => {
      console.log(chalk.cyan(`Parsing: ${file}`));
      const result = specParser.parseFile(file);
      if (!result.success || !result.document) {
        console.log(chalk.red("Parse failed:"));
        for (const error of result.errors) console.log(chalk.red(`  ✗ ${error.message}`));
        return;
      }

      console.log(chalk.green("✓ Parse successful\n"));
      console.log(chalk.bold(result.document.metadata.title));
      console.log(chalk.gray(`Version: ${result.document.metadata.version}`));
      console.log(chalk.gray(`Format: ${result.document.format}`));
      console.log(chalk.gray(`Sections: ${result.document.sections.length}`));
      if (result.warnings.length > 0) {
        console.log(chalk.yellow(`\nWarnings: ${result.warnings.length}`));
        for (const warning of result.warnings) console.log(chalk.yellow(`  ⚠ ${warning.message}`));
      }
      console.log(chalk.cyan("\nSections:"));
      for (const section of result.document.sections) {
        console.log(`  ${chalk.bold(section.title)} [${section.type}]`);
        console.log(chalk.gray(`    ${section.content.slice(0, 100)}${section.content.length > 100 ? "..." : ""}`));
      }
    });

  specCommand
    .command("validate <file>")
    .description("Validate a specification file")
    .action((file: string) => {
      console.log(chalk.cyan(`Validating: ${file}`));
      const parseResult = specParser.parseFile(file);
      if (!parseResult.success || !parseResult.document) {
        console.log(chalk.red("Parse failed - cannot validate:"));
        for (const error of parseResult.errors) console.log(chalk.red(`  ✗ ${error.message}`));
        return;
      }

      const validationResult = specValidator.validate(parseResult.document);
      console.log();
      console.log(chalk.bold("Validation Summary:"));
      console.log(chalk.gray(`  Sections: ${validationResult.summary.total}`));
      console.log(chalk.gray(`  Passed: ${validationResult.summary.passed}`));
      console.log(chalk.red(`  Failed: ${validationResult.summary.failed}`));
      console.log(chalk.yellow(`  Warnings: ${validationResult.summary.warnings}`));
      if (validationResult.errors.length > 0) {
        console.log(chalk.red("\nErrors:"));
        for (const error of validationResult.errors) {
          console.log(chalk.red(`  ✗ [${error.validationId}] ${error.message}`));
          if (error.location) console.log(chalk.gray(`    Location: ${error.location}`));
        }
      }
      if (validationResult.warnings.length > 0) {
        console.log(chalk.yellow("\nWarnings:"));
        for (const warning of validationResult.warnings) {
          console.log(chalk.yellow(`  ⚠ [${warning.validationId}] ${warning.message}`));
          if (warning.suggestion) console.log(chalk.gray(`    Suggestion: ${warning.suggestion}`));
        }
      }
      console.log(validationResult.valid ? chalk.green("\n✓ Specification is valid") : chalk.red("\n✗ Specification has errors"));
    });

  specCommand
    .command("generate <file>")
    .description("Generate code from a specification")
    .option("-t, --target <target>", "Generation target")
    .option("-o, --output <dir>", "Output directory")
    .action((file: string, options: { target?: string; output?: string }) => {
      console.log(chalk.cyan(`Generating from: ${file}`));
      const parseResult = specParser.parseFile(file);
      if (!parseResult.success || !parseResult.document) {
        console.log(chalk.red("Parse failed - cannot generate:"));
        for (const error of parseResult.errors) console.log(chalk.red(`  ✗ ${error.message}`));
        return;
      }

      const target = (options.target ?? "typescript-types") as SpecGenerationTarget;
      console.log(chalk.gray(`Target: ${target}`));
      const genResult = specGenerator.generate({
        spec: parseResult.document,
        target,
        config: { outputDir: options.output },
      });
      if (genResult.success) {
        console.log(chalk.green(`✓ Generated ${genResult.files.length} files:\n`));
        for (const generatedFile of genResult.files) {
          console.log(`  ${chalk.bold(generatedFile.path)}`);
          console.log(chalk.gray(`    Language: ${generatedFile.language}`));
          console.log(chalk.gray(`    ${generatedFile.description}`));
          console.log();
        }
      } else {
        console.log(chalk.red("Generation failed:"));
        for (const error of genResult.errors) console.log(chalk.red(`  ✗ ${error}`));
      }
      if (genResult.warnings.length > 0) {
        console.log(chalk.yellow("Warnings:"));
        for (const warning of genResult.warnings) console.log(chalk.yellow(`  ⚠ ${warning}`));
      }
    });

  specCommand
    .command("list-targets")
    .description("List available generation targets")
    .action(() => {
      console.log(chalk.cyan("Available generation targets:\n"));
      const targets: Array<{ name: SpecGenerationTarget; description: string }> = [
        { name: "typescript-types", description: "Generate TypeScript type definitions" },
        { name: "openapi-spec", description: "Generate OpenAPI 3.0 specification" },
        { name: "api-scaffold", description: "Generate Express API scaffold" },
        { name: "data-models", description: "Generate data model classes" },
        { name: "test-templates", description: "Generate test templates" },
        { name: "documentation", description: "Generate markdown documentation" },
        { name: "custom", description: "Custom generation target (requires template)" },
      ];
      for (const target of targets) {
        console.log(`  ${chalk.bold(target.name)}`);
        console.log(chalk.gray(`    ${target.description}`));
        console.log();
      }
    });
};
