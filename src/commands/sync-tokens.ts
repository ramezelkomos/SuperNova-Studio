//
//  sync-tokens.ts
//  Supernova CLI
//
//  Created by Jiri Trecak.
//  Copyright © 2022 Supernova.io. All rights reserved.
//

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Imports

import { Command, Flags } from "@oclif/core"
import { Brand, DesignSystem, DesignSystemVersion, Supernova, SupernovaToolsDesignTokensPlugin, Token, TokenGroup } from "@supernovaio/supernova-sdk"
import { DTProcessedTokenNode } from "@supernovaio/supernova-sdk/build/Typescript/src/tools/design-tokens/utilities/SDKDTJSONConverter"

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Definition

interface SyncDesignTokensFlags {
  apiKey: string
  designSystemId: string
  tokenFilePath?: string
  tokenDirPath?: string
  configFilePath: string
  dev: boolean
}

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Configuration

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Tool implementation

/** Command that handles synchronization with design tokens plugin */
export class SyncDesignTokens extends Command {
  // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
  // MARK: - Command configuration

  // Command help description
  static description = "Synchronize tokens from Figma Tokens plugin to Supernova workspaces"

  // Examples how to use the command
  static examples = [
    `$ @supernovaio/cli sync-tokens --apiKey="{xxx-xxx-xxx}" --designSystemId={1234} --tokenFilePath "/path/to/tokens.json" --configFilePath "/path/to/config.json"`,
    `$ @supernovaio/cli sync-tokens --apiKey="{xxx-xxx-xxx}" --designSystemId={1234} --tokenDirPath "/path/to/tokens/" --configFilePath "/path/to/config.json"`,
  ]

  // How this command can be run
  static aliases: [
    "sync-tokens"
  ]

  // Static flags to enable / disable features
  static flags = {
    apiKey: Flags.string({description: 'API key to use for accessing Supernova instance', required: true}),
    designSystemId: Flags.string({description: 'Design System to synchronize contents with', required: true}),
    tokenFilePath: Flags.string({description: 'Path to JSON file containing token definitions', exactlyOne: ["tokenDirPath", "tokenFilePath"]}),
    tokenDirPath: Flags.string({description: 'Path to directory of JSON files containing token definitions', exactlyOne: ["tokenDirPath", "tokenFilePath"]}),
    configFilePath: Flags.string({description: 'Path to configuration JSON file', required: true, exclusive: []}),
    dev: Flags.boolean({description: 'When enabled, CLI will target dev server', hidden: true, default: false})
  }

  // Required and optional attributes
  static args = []

  // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
  // MARK: - Command runtime

  async run(): Promise<void> {

    const { args, flags } = await this.parse(SyncDesignTokens)

    // Get workspace -> design system –> version
    let connected = await this.getWritableVersion(flags)
    let dsTool = new SupernovaToolsDesignTokensPlugin(connected.version)

    if (flags.tokenDirPath) {
      await dsTool.synchronizeTokensFromDirectory(flags.tokenDirPath, flags.configFilePath)
    } else if (flags.tokenFilePath) {
      await dsTool.synchronizeTokensFromFile(flags.tokenFilePath, flags.configFilePath)
    }
    
    this.log(`Tokens synchronized`)
  }

  async getWritableVersion(flags: SyncDesignTokensFlags): Promise<{
    instance: Supernova
    designSystem: DesignSystem,
    version: DesignSystemVersion
  }> {

    if (!flags.apiKey || flags.apiKey.length === 0) {
      throw new Error(`API key must not be empty`)
    }

    if (!flags.designSystemId || flags.designSystemId.length === 0) {
      throw new Error(`Design System ID must not be empty`)
    }

    // Create instance for prod / dev
    const devAPIhost = "https://dev.api2.supernova.io/api"
    let sdkInstance = new Supernova(flags.apiKey, flags.dev ? devAPIhost : null, null) 

    let designSystem = await sdkInstance.designSystem(flags.designSystemId)
    if (!designSystem) {
      throw new Error(`Design system ${flags.designSystemId} not found or not available under provided API key`)
    }

    let version = await designSystem.activeVersion()
    if (!version) {
      throw new Error(`Design system  ${flags.designSystemId} writable version not found or not available under provided API key`)
    }

    return {
      instance: sdkInstance,
      designSystem: designSystem,
      version: version
    }
  }
}