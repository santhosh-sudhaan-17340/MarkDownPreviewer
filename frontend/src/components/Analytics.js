import React, { useEffect, useState } from 'react';
import { analyticsAPI } from '../services/api';

export default function Analytics() {
  const [backlog, setBacklog] = useState(null);
  const [slaBreaches, setSlaBreaches] = useState(null);
  const [productivity, setProductivity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const [backlogRes, slaRes, prodRes] = await Promise.all([
        analyticsAPI.getBacklog(),
        analyticsAPI.getSlaBreaches(),
        analyticsAPI.getAgentProductivity()
      ]);

      setBacklog(backlogRes.data);
      setSlaBreaches(slaRes.data);
      setProductivity(prodRes.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>

      {/* Backlog Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Backlog Analysis</h2>

        <h3 className="text-lg font-medium text-gray-700 mb-2">By Status</h3>
        <div className="overflow-x-auto mb-6">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SLA Breached</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {backlog?.byStatus?.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.status}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.ticket_count}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{item.breached_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-medium text-gray-700 mb-2">By Agent</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">In Progress</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pending</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SLA Breached</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {backlog?.byAgent?.map((agent, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{agent.agent_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.assigned_tickets}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.in_progress}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.pending}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{agent.sla_breached}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SLA Breaches Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">SLA Breaches</h2>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{slaBreaches?.summary?.total_breached || 0}</div>
            <div className="text-sm text-gray-600">Total Breached</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{slaBreaches?.summary?.active_breached || 0}</div>
            <div className="text-sm text-gray-600">Active Breached</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{slaBreaches?.atRisk?.length || 0}</div>
            <div className="text-sm text-gray-600">At Risk</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{slaBreaches?.summary?.critical_breached || 0}</div>
            <div className="text-sm text-gray-600">Critical Breached</div>
          </div>
        </div>

        <h3 className="text-lg font-medium text-gray-700 mb-2">Tickets At Risk</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours Until Breach</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {slaBreaches?.atRisk?.map((ticket, idx) => (
                <tr key={idx} className="bg-yellow-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ticket.ticket_number}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{ticket.subject}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ticket.priority}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ticket.assigned_agent || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{parseFloat(ticket.hours_until_breach).toFixed(1)}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Agent Productivity */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Agent Productivity</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Handled</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resolved</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Resolution (hrs)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SLA Compliance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {productivity?.productivity?.map((agent, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{agent.agent_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.total_tickets_handled}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{agent.resolved_tickets}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">{agent.active_tickets}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {agent.avg_resolution_time_hours ? parseFloat(agent.avg_resolution_time_hours).toFixed(1) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full ${
                      agent.sla_compliance_rate >= 90 ? 'bg-green-100 text-green-800' :
                      agent.sla_compliance_rate >= 70 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {agent.sla_compliance_rate || 0}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
