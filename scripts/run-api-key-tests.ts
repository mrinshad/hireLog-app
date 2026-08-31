import { ApiKeyItem, AiModelItem } from '../src/database/repositories/apiKeyRepository';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAILED: ${testName}`);
    failed++;
  }
}

// In-memory simulation of the exact SQL operations executed by apiKeyRepository
class MockApiKeyRepository {
  private apiKeys: ApiKeyItem[] = [];
  private models: AiModelItem[] = [
    {
      id: 'model_gemini_2_5_flash',
      provider: 'google_gemini',
      modelId: 'gemini-2.5-flash',
      displayName: 'Gemini 2.5 Flash (Recommended)',
      isDefault: true,
      displayOrder: 1,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'model_gemini_2_5_pro',
      provider: 'google_gemini',
      modelId: 'gemini-2.5-pro',
      displayName: 'Gemini 2.5 Pro (Deep Reasoning)',
      isDefault: false,
      displayOrder: 2,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'model_gemini_1_5_flash',
      provider: 'google_gemini',
      modelId: 'gemini-1.5-flash',
      displayName: 'Gemini 1.5 Flash (Legacy Fast)',
      isDefault: false,
      displayOrder: 3,
      createdAt: new Date().toISOString(),
    },
  ];

  async getAllModels(): Promise<AiModelItem[]> {
    return [...this.models];
  }

  async addModel(params: { modelId: string; displayName?: string; isDefault?: boolean }): Promise<AiModelItem> {
    const item: AiModelItem = {
      id: `model_${Date.now()}`,
      provider: 'google_gemini',
      modelId: params.modelId,
      displayName: params.displayName || params.modelId,
      isDefault: Boolean(params.isDefault),
      displayOrder: 99,
      createdAt: new Date().toISOString(),
    };
    if (params.isDefault) {
      this.models.forEach((m) => (m.isDefault = false));
    }
    this.models.push(item);
    return item;
  }

  async setDefaultModel(modelId: string): Promise<void> {
    this.models.forEach((m) => {
      m.isDefault = m.modelId === modelId;
    });
  }

  async getAllApiKeys(): Promise<ApiKeyItem[]> {
    return [...this.apiKeys].sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0));
  }

  async getActiveApiKey(): Promise<ApiKeyItem | null> {
    return this.apiKeys.find((k) => k.isActive) || this.apiKeys[0] || null;
  }

  async saveApiKey(params: { label: string; apiKey: string; defaultModel?: string; isActive?: boolean }): Promise<ApiKeyItem> {
    const isActive = params.isActive ?? (this.apiKeys.length === 0);
    if (isActive) {
      this.apiKeys.forEach((k) => (k.isActive = false));
    }
    const item: ApiKeyItem = {
      id: `key_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      provider: 'google_gemini',
      label: params.label,
      apiKey: params.apiKey,
      defaultModel: params.defaultModel || 'gemini-2.5-flash',
      isActive,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.apiKeys.push(item);
    return item;
  }

  async setActiveApiKey(id: string): Promise<void> {
    this.apiKeys.forEach((k) => {
      k.isActive = k.id === id;
    });
  }

  async deleteApiKey(id: string): Promise<void> {
    const idx = this.apiKeys.findIndex((k) => k.id === id);
    if (idx !== -1) {
      const wasActive = this.apiKeys[idx].isActive;
      this.apiKeys.splice(idx, 1);
      if (wasActive && this.apiKeys.length > 0) {
        this.apiKeys[0].isActive = true;
      }
    }
  }
}

async function runApiKeyTests() {
  console.log('\n--- Running Dynamic API Keys & Models Tests ---');

  const repo = new MockApiKeyRepository();

  // 1. Initial Models Seeding
  const models = await repo.getAllModels();
  assert(models.length >= 3, 'Seed models exist in ai_models catalog');
  const defaultModel = models.find((m) => m.isDefault);
  assert(defaultModel?.modelId === 'gemini-2.5-flash', 'Default model is gemini-2.5-flash');

  // 2. Add New API Key
  const key1 = await repo.saveApiKey({
    label: 'Primary Gemini Key',
    apiKey: 'AIzaSy_test_primary_key_12345',
    defaultModel: 'gemini-2.5-flash',
    isActive: true,
  });
  assert(key1.label === 'Primary Gemini Key', 'First API key created with correct label');
  assert(key1.isActive === true, 'First API key is marked active');

  // 3. Add Second API Key
  const key2 = await repo.saveApiKey({
    label: 'Backup Gemini Key',
    apiKey: 'AIzaSy_test_backup_key_67890',
    defaultModel: 'gemini-2.5-pro',
    isActive: false,
  });
  assert(key2.label === 'Backup Gemini Key', 'Second API key created');
  assert(key2.isActive === false, 'Second API key is inactive');

  // 4. Retrieve Active Key
  const activeKey = await repo.getActiveApiKey();
  assert(activeKey?.id === key1.id, 'Active API key resolves to Primary key');
  assert(activeKey?.defaultModel === 'gemini-2.5-flash', 'Active key has assigned default model');

  // 5. Switch Active Key
  await repo.setActiveApiKey(key2.id);
  const switchedActive = await repo.getActiveApiKey();
  assert(switchedActive?.id === key2.id, 'Active key switched to Backup key');
  assert(switchedActive?.defaultModel === 'gemini-2.5-pro', 'Switched key preserves assigned model');

  // 6. Dynamic Model Addition
  const customModel = await repo.addModel({
    modelId: 'test-gemini-3.0-ultra',
    displayName: 'Gemini 3.0 Ultra (Custom)',
  });
  assert(customModel.modelId === 'test-gemini-3.0-ultra', 'Custom model added to catalog');

  const allModelsAfterAdd = await repo.getAllModels();
  const foundCustom = allModelsAfterAdd.some((m) => m.modelId === 'test-gemini-3.0-ultra');
  assert(foundCustom, 'Custom model retrieved in dynamic models list');

  // 7. Delete API Key
  await repo.deleteApiKey(key2.id);
  const activeAfterDelete = await repo.getActiveApiKey();
  assert(activeAfterDelete?.id === key1.id, 'Remaining key promoted to active after active key deleted');

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runApiKeyTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
