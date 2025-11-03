import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { getNodeBasicPropsForDefinition } from '@/lib/node-configs'
import React from 'react'
import { ConfigComponentProps, NodeDefinition } from '../types'

// MCP Node Configuration Component
const McpConfigComponent: React.FC<ConfigComponentProps> = ({
  config,
  onChange,
}) => {
  const transportType = config.transportType || 'http'

  return (
    <div className="space-y-4">
      <div>
        <Label>Transport Type</Label>
        <select
          value={transportType}
          onChange={(e) =>
            onChange({ ...config, transportType: e.target.value })
          }
          className="mt-1 w-full rounded border border-input bg-background px-3 py-2"
        >
          <option value="http">HTTP/SSE</option>
          <option value="stdio">Stdio (Local)</option>
        </select>
      </div>

      {transportType === 'http' ? (
        <>
          <div>
            <Label>Server URL</Label>
            <Input
              value={config.url || ''}
              onChange={(e) => onChange({ ...config, url: e.target.value })}
              placeholder="https://api.example.com/mcp"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Authentication Type</Label>
            <select
              value={config.authType || 'none'}
              onChange={(e) =>
                onChange({ ...config, authType: e.target.value })
              }
              className="mt-1 w-full rounded border border-input bg-background px-3 py-2"
            >
              <option value="none">None</option>
              <option value="api_key">API Key</option>
              <option value="bearer">Bearer Token</option>
              <option value="custom">Custom Headers</option>
            </select>
          </div>

          {config.authType === 'api_key' && (
            <div>
              <Label>API Key</Label>
              <Input
                value={config.apiKey || ''}
                onChange={(e) =>
                  onChange({ ...config, apiKey: e.target.value })
                }
                placeholder="your-api-key"
                type="password"
                className="mt-1"
              />
            </div>
          )}

          {config.authType === 'bearer' && (
            <div>
              <Label>Bearer Token</Label>
              <Input
                value={config.bearerToken || ''}
                onChange={(e) =>
                  onChange({ ...config, bearerToken: e.target.value })
                }
                placeholder="your-bearer-token"
                type="password"
                className="mt-1"
              />
            </div>
          )}

          {config.authType === 'custom' && (
            <div>
              <Label>Custom Headers (JSON)</Label>
              <Textarea
                value={config.customHeaders || ''}
                onChange={(e) =>
                  onChange({ ...config, customHeaders: e.target.value })
                }
                placeholder='{"Authorization": "Bearer token", "X-Custom": "value"}'
                rows={3}
                className="mt-1 font-mono text-sm"
              />
            </div>
          )}

          <div>
            <Label>Timeout (seconds)</Label>
            <Input
              type="number"
              value={config.timeout || 30}
              onChange={(e) =>
                onChange({
                  ...config,
                  timeout: parseInt(e.target.value, 10) || 30,
                })
              }
              placeholder="30"
              className="mt-1"
            />
          </div>
        </>
      ) : (
        <div>
          <Label>Server URL</Label>
          <Input
            value={config.serverUrl || ''}
            onChange={(e) =>
              onChange({ ...config, serverUrl: e.target.value })
            }
            placeholder="path/to/mcp_server.py"
            className="mt-1"
          />
        </div>
      )}

      <div>
        <Label>Tool Name</Label>
        <Input
          value={config.toolName || ''}
          onChange={(e) => onChange({ ...config, toolName: e.target.value })}
          placeholder="tool_name"
          className="mt-1"
        />
      </div>

      <div>
        <Label>Parameters (JSON)</Label>
        <Textarea
          value={config.parameters || ''}
          onChange={(e) =>
            onChange({ ...config, parameters: e.target.value })
          }
          placeholder='{ "param1": "value1" }'
          rows={4}
          className="mt-1 font-mono text-sm"
        />
      </div>
    </div>
  )
}

export const mcpNodeDefinition: NodeDefinition = {
  ...getNodeBasicPropsForDefinition('mcp')!,
  nodeType: 'builtins.MCP',

  ports: {
    inputs: [
      {
        id: 'in',
        label: 'Input',
        position: 'left',
      },
    ],
    outputs: [
      {
        id: 'out',
        label: 'Output',
        position: 'right',
      },
    ],
  },

  getDefaultConfig: () => ({
    transportType: 'http',
    url: '',
    serverUrl: '',
    authType: 'none',
    apiKey: '',
    bearerToken: '',
    customHeaders: '',
    timeout: 30,
    toolName: '',
    parameters: '',
  }),

  ConfigComponent: McpConfigComponent,
}
