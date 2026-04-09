/**
 * AI connection test stub — will be implemented when API keys are configured
 */
export async function testConnection(engine: string): Promise<{ success: boolean; message: string; latencyMs: number; error?: string }> {
  // Simulate connection test
  await new Promise((r) => setTimeout(r, 1000));
  return {
    success: true,
    message: `${engine} connection test passed (demo mode)`,
    latencyMs: 250,
  };
}
