import type { Configuration } from '@rspack/core';
import { normalizeAssets } from './normalize-assets';
import { NxAppRspackPluginOptions } from '../plugins/utils/models';
import { applyBaseConfig } from '../plugins/utils/apply-base-config';
import {
  NxRspackExecutionContext,
  AsyncNxComposableRspackPlugin,
} from './config';

const processed = new Set();

export type WithNxOptions = Partial<NxAppRspackPluginOptions>;

/**
 * @param {WithNxOptions} pluginOptions
 * @returns {AsyncNxComposableRspackPlugin}
 */
export function withNx(
  pluginOptions: WithNxOptions = {}
): AsyncNxComposableRspackPlugin {
  return async function makeConfig(
    config: Configuration,
    { options, context }: NxRspackExecutionContext
  ): Promise<Configuration> {
    if (processed.has(config)) return config;

    applyBaseConfig(
      {
        ...options,
        ...pluginOptions,
        target: options.target ?? 'web',
        assets: options.assets
          ? options.assets
          : pluginOptions.assets
            ? normalizeAssets(
                pluginOptions.assets,
                options.root,
                options.sourceRoot
              )
            : [],
        root: context.root,
        projectName: context.projectName,
        targetName: context.targetName,
        configurationName: context.configurationName,
        projectGraph: context.projectGraph,
        useLegacyHtmlPlugin: pluginOptions.useLegacyHtmlPlugin ?? false,
      },
      config
    );

    processed.add(config);
    return config;
  };
}
