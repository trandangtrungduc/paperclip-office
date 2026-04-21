import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PaperclipClient } from '../../src/main/paperclip/client'

// Mock ky
const mockJsonFn = vi.fn()
const mockGet = vi.fn(() => ({ json: mockJsonFn }))

vi.mock('ky', () => {
  const createFn = vi.fn(() => ({ get: mockGet }))
  return {
    default: { create: createFn },
    __mockCreate: createFn
  }
})

describe('PaperclipClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --- Constructor ---
  describe('constructor', () => {
    it('strips trailing slashes from baseUrl', () => {
      const client = new PaperclipClient('http://localhost:3100///')
      expect(client.baseUrl).toBe('http://localhost:3100')
    })

    it('stores empty string when no apiKey provided', () => {
      const client = new PaperclipClient('http://localhost:3100')
      expect(client.apiKey).toBe('')
    })

    it('stores apiKey when provided', () => {
      const client = new PaperclipClient('http://localhost:3100', 'my-key')
      expect(client.apiKey).toBe('my-key')
    })

    it('creates ky instance with correct config', async () => {
      const { __mockCreate } = await import('ky') as any
      new PaperclipClient('http://localhost:3100', 'my-key')
      expect(__mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          prefixUrl: 'http://localhost:3100/api',
          timeout: 15_000,
          headers: { Authorization: 'Bearer my-key' }
        })
      )
    })

    it('creates ky instance without auth header when no key', async () => {
      const { __mockCreate } = await import('ky') as any
      __mockCreate.mockClear()
      new PaperclipClient('http://localhost:3100')
      expect(__mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {}
        })
      )
    })
  })

  // --- API Methods ---
  describe('getHealth', () => {
    it('calls GET health', async () => {
      mockGet.mockReturnValueOnce({ json: vi.fn() })
      const client = new PaperclipClient('http://localhost:3100')
      await client.getHealth()
      expect(mockGet).toHaveBeenCalledWith('health')
    })
  })

  describe('getCompanies', () => {
    it('returns data array from wrapped response', async () => {
      const companies = [{ id: 'c1', name: 'Test' }]
      mockJsonFn.mockResolvedValueOnce({ data: companies })
      const client = new PaperclipClient('http://localhost:3100')
      const result = await client.getCompanies()
      expect(mockGet).toHaveBeenCalledWith('companies')
      expect(result).toEqual(companies)
    })

    it('falls back to raw response when data wrapper is missing', async () => {
      const companies = [{ id: 'c1', name: 'Test' }]
      mockJsonFn.mockResolvedValueOnce(companies)
      const client = new PaperclipClient('http://localhost:3100')
      const result = await client.getCompanies()
      expect(result).toEqual(companies)
    })
  })

  describe('getCompany', () => {
    it('calls GET companies/:id', async () => {
      const company = { id: 'c1', name: 'Test' }
      mockJsonFn.mockResolvedValueOnce(company)
      const client = new PaperclipClient('http://localhost:3100')
      const result = await client.getCompany('c1')
      expect(mockGet).toHaveBeenCalledWith('companies/c1')
      expect(result).toEqual(company)
    })
  })

  describe('getAgents', () => {
    it('returns data array', async () => {
      const agents = [{ id: 'a1' }]
      mockJsonFn.mockResolvedValueOnce({ data: agents })
      const client = new PaperclipClient('http://localhost:3100')
      const result = await client.getAgents('c1')
      expect(mockGet).toHaveBeenCalledWith('companies/c1/agents')
      expect(result).toEqual(agents)
    })

    it('falls back to raw response when data is missing', async () => {
      const agents = [{ id: 'a1' }]
      mockJsonFn.mockResolvedValueOnce(agents)
      const client = new PaperclipClient('http://localhost:3100')
      const result = await client.getAgents('c1')
      expect(result).toEqual(agents)
    })
  })

  describe('getProjects', () => {
    it('returns data array', async () => {
      mockJsonFn.mockResolvedValueOnce({ data: [{ id: 'p1' }] })
      const client = new PaperclipClient('http://localhost:3100')
      const result = await client.getProjects('c1')
      expect(mockGet).toHaveBeenCalledWith('companies/c1/projects')
      expect(result).toEqual([{ id: 'p1' }])
    })

    it('falls back to raw response when data is missing', async () => {
      const projects = [{ id: 'p1' }]
      mockJsonFn.mockResolvedValueOnce(projects)
      const client = new PaperclipClient('http://localhost:3100')
      const result = await client.getProjects('c1')
      expect(result).toEqual(projects)
    })
  })

  describe('getIssues', () => {
    it('returns data array', async () => {
      mockJsonFn.mockResolvedValueOnce({ data: [{ id: 'i1' }] })
      const client = new PaperclipClient('http://localhost:3100')
      const result = await client.getIssues('c1')
      expect(mockGet).toHaveBeenCalledWith('companies/c1/issues')
      expect(result).toEqual([{ id: 'i1' }])
    })

    it('falls back to raw response when data is missing', async () => {
      const issues = [{ id: 'i1' }]
      mockJsonFn.mockResolvedValueOnce(issues)
      const client = new PaperclipClient('http://localhost:3100')
      const result = await client.getIssues('c1')
      expect(result).toEqual(issues)
    })
  })

  describe('getGoals', () => {
    it('returns data array', async () => {
      mockJsonFn.mockResolvedValueOnce({ data: [{ id: 'g1' }] })
      const client = new PaperclipClient('http://localhost:3100')
      const result = await client.getGoals('c1')
      expect(mockGet).toHaveBeenCalledWith('companies/c1/goals')
      expect(result).toEqual([{ id: 'g1' }])
    })

    it('falls back to raw response when data is missing', async () => {
      const goals = [{ id: 'g1' }]
      mockJsonFn.mockResolvedValueOnce(goals)
      const client = new PaperclipClient('http://localhost:3100')
      const result = await client.getGoals('c1')
      expect(result).toEqual(goals)
    })
  })

  describe('getApprovals', () => {
    it('returns data array', async () => {
      mockJsonFn.mockResolvedValueOnce({ data: [{ id: 'ap1' }] })
      const client = new PaperclipClient('http://localhost:3100')
      const result = await client.getApprovals('c1')
      expect(mockGet).toHaveBeenCalledWith('companies/c1/approvals')
      expect(result).toEqual([{ id: 'ap1' }])
    })

    it('falls back to raw response when data is missing', async () => {
      const approvals = [{ id: 'ap1' }]
      mockJsonFn.mockResolvedValueOnce(approvals)
      const client = new PaperclipClient('http://localhost:3100')
      const result = await client.getApprovals('c1')
      expect(result).toEqual(approvals)
    })
  })

  describe('getCostSummary', () => {
    it('returns cost summary on success', async () => {
      const summary = { totalCostCents: 5000, byAgent: [] }
      mockJsonFn.mockResolvedValueOnce(summary)
      const client = new PaperclipClient('http://localhost:3100')
      const result = await client.getCostSummary('c1')
      expect(mockGet).toHaveBeenCalledWith('companies/c1/costs/summary')
      expect(result).toEqual(summary)
    })

    it('returns null on error', async () => {
      mockJsonFn.mockRejectedValueOnce(new Error('Not found'))
      const client = new PaperclipClient('http://localhost:3100')
      const result = await client.getCostSummary('c1')
      expect(result).toBeNull()
    })
  })

  describe('getCostByAgentModel', () => {
    it('returns array directly when response is an array', async () => {
      const rows = [{ agentId: 'a1', model: 'gpt-4', costCents: 100 }]
      mockJsonFn.mockResolvedValueOnce(rows)
      const client = new PaperclipClient('http://localhost:3100')
      const result = await client.getCostByAgentModel('c1')
      expect(mockGet).toHaveBeenCalledWith('companies/c1/costs/by-agent-model')
      expect(result).toEqual(rows)
    })

    it('returns data array from wrapped response', async () => {
      const rows = [{ agentId: 'a1', model: 'gpt-4', costCents: 100 }]
      mockJsonFn.mockResolvedValueOnce({ data: rows })
      const client = new PaperclipClient('http://localhost:3100')
      const result = await client.getCostByAgentModel('c1')
      expect(result).toEqual(rows)
    })

    it('returns empty array when wrapped response has no data', async () => {
      mockJsonFn.mockResolvedValueOnce({})
      const client = new PaperclipClient('http://localhost:3100')
      const result = await client.getCostByAgentModel('c1')
      expect(result).toEqual([])
    })

    it('returns empty array on error', async () => {
      mockJsonFn.mockRejectedValueOnce(new Error('Server error'))
      const client = new PaperclipClient('http://localhost:3100')
      const result = await client.getCostByAgentModel('c1')
      expect(result).toEqual([])
    })
  })

  describe('getActivity', () => {
    it('returns data array', async () => {
      mockJsonFn.mockResolvedValueOnce({ data: [{ id: 'act1' }] })
      const client = new PaperclipClient('http://localhost:3100')
      const result = await client.getActivity('c1')
      expect(mockGet).toHaveBeenCalledWith('companies/c1/activity')
      expect(result).toEqual([{ id: 'act1' }])
    })

    it('falls back to raw response when data is missing', async () => {
      const activity = [{ id: 'act1' }]
      mockJsonFn.mockResolvedValueOnce(activity)
      const client = new PaperclipClient('http://localhost:3100')
      const result = await client.getActivity('c1')
      expect(result).toEqual(activity)
    })
  })

  describe('getRoutines', () => {
    it('returns data array', async () => {
      mockJsonFn.mockResolvedValueOnce({ data: [{ id: 'r1' }] })
      const client = new PaperclipClient('http://localhost:3100')
      const result = await client.getRoutines('c1')
      expect(mockGet).toHaveBeenCalledWith('companies/c1/routines')
      expect(result).toEqual([{ id: 'r1' }])
    })

    it('falls back to raw response when data is missing', async () => {
      const routines = [{ id: 'r1' }]
      mockJsonFn.mockResolvedValueOnce(routines)
      const client = new PaperclipClient('http://localhost:3100')
      const result = await client.getRoutines('c1')
      expect(result).toEqual(routines)
    })
  })

  describe('getPlugins', () => {
    it('returns data array', async () => {
      mockJsonFn.mockResolvedValueOnce({ data: [{ id: 'pl1' }] })
      const client = new PaperclipClient('http://localhost:3100')
      const result = await client.getPlugins()
      expect(mockGet).toHaveBeenCalledWith('plugins')
      expect(result).toEqual([{ id: 'pl1' }])
    })

    it('falls back to raw response when data is missing', async () => {
      const plugins = [{ id: 'pl1' }]
      mockJsonFn.mockResolvedValueOnce(plugins)
      const client = new PaperclipClient('http://localhost:3100')
      const result = await client.getPlugins()
      expect(result).toEqual(plugins)
    })
  })
})
