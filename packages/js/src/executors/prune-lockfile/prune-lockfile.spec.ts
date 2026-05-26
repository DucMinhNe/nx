import { type PackageJson } from 'nx/src/utils/package-json';
import { getCatalogManager } from '@nx/devkit/internal';
import { resolveCatalogReferences } from './prune-lockfile';

jest.mock('@nx/devkit/internal', () => ({
  ...jest.requireActual('@nx/devkit/internal'),
  getCatalogManager: jest.fn(),
}));

describe('resolveCatalogReferences', () => {
  const mockGetCatalogManager = getCatalogManager as jest.MockedFunction<
    typeof getCatalogManager
  >;

  function makeManager(catalog: Record<string, string>) {
    return {
      isCatalogReference: (version: string) => version.startsWith('catalog:'),
      resolveCatalogReference: jest.fn(
        (_root: string, packageName: string, _version: string) =>
          catalog[packageName] ?? null
      ),
    } as any;
  }

  beforeEach(() => {
    mockGetCatalogManager.mockReset();
  });

  it('should return input unchanged when no catalog manager is available', () => {
    mockGetCatalogManager.mockReturnValue(null);
    const packageJson: PackageJson = {
      name: 'app',
      version: '0.0.1',
      dependencies: { react: 'catalog:' },
    };

    const result = resolveCatalogReferences(packageJson);

    expect(result).toBe(packageJson);
  });

  it('should resolve catalog references across all dependency sections', () => {
    mockGetCatalogManager.mockReturnValue(
      makeManager({
        react: '^18.0.0',
        zod: '^3.22.0',
        jest: '^29.0.0',
        typescript: '^5.0.0',
      })
    );
    const packageJson: PackageJson = {
      name: 'app',
      version: '0.0.1',
      dependencies: { react: 'catalog:', lodash: '^4.17.0' },
      optionalDependencies: { zod: 'catalog:' },
      devDependencies: { jest: 'catalog:' },
      peerDependencies: { typescript: 'catalog:' },
    };

    const result = resolveCatalogReferences(packageJson);

    expect(result.dependencies).toEqual({
      react: '^18.0.0',
      lodash: '^4.17.0',
    });
    expect(result.optionalDependencies).toEqual({ zod: '^3.22.0' });
    expect(result.devDependencies).toEqual({ jest: '^29.0.0' });
    expect(result.peerDependencies).toEqual({ typescript: '^5.0.0' });
  });

  it('should preserve non-catalog version specifiers', () => {
    mockGetCatalogManager.mockReturnValue(makeManager({ react: '^18.0.0' }));
    const packageJson: PackageJson = {
      name: 'app',
      version: '0.0.1',
      dependencies: {
        react: 'catalog:',
        lodash: '^4.17.0',
        '@scope/pkg': 'workspace:*',
        local: 'file:./local',
      },
    };

    const result = resolveCatalogReferences(packageJson);

    expect(result.dependencies).toEqual({
      react: '^18.0.0',
      lodash: '^4.17.0',
      '@scope/pkg': 'workspace:*',
      local: 'file:./local',
    });
  });

  it('should not mutate the input package.json', () => {
    mockGetCatalogManager.mockReturnValue(makeManager({ react: '^18.0.0' }));
    const packageJson: PackageJson = {
      name: 'app',
      version: '0.0.1',
      dependencies: { react: 'catalog:' },
    };

    const result = resolveCatalogReferences(packageJson);

    expect(packageJson.dependencies).toEqual({ react: 'catalog:' });
    expect(result).not.toBe(packageJson);
    expect(result.dependencies).not.toBe(packageJson.dependencies);
  });

  it('should throw when a catalog reference cannot be resolved', () => {
    mockGetCatalogManager.mockReturnValue(makeManager({}));
    const packageJson: PackageJson = {
      name: 'app',
      version: '0.0.1',
      dependencies: { react: 'catalog:' },
    };

    expect(() => resolveCatalogReferences(packageJson)).toThrow(
      'Could not resolve catalog reference for package react@catalog:.'
    );
  });

  it('should handle missing dependency sections', () => {
    mockGetCatalogManager.mockReturnValue(makeManager({ react: '^18.0.0' }));
    const packageJson: PackageJson = {
      name: 'app',
      version: '0.0.1',
      dependencies: { react: 'catalog:' },
    };

    const result = resolveCatalogReferences(packageJson);

    expect(result.dependencies).toEqual({ react: '^18.0.0' });
    expect(result.devDependencies).toBeUndefined();
    expect(result.peerDependencies).toBeUndefined();
    expect(result.optionalDependencies).toBeUndefined();
  });
});
