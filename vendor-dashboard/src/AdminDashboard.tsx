import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

export default function AdminDashboard() {
  const vendors = useQuery(api.users.listVendors);
  const completedProjects = useQuery(api.projects.listCompleted);
  const upcomingProjects = useQuery(api.projects.listUpcoming);
  const createProject = useMutation(api.projects.createProject);
  const updateBidStatus = useMutation(api.bids.updateBidStatus);
  const bidsForProject = useMutation(api.bids.listBidsForProject);

  const [tab, setTab] = useState<"projects" | "vendors">("projects");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    trade: "",
    budget: "",
    type: "upcoming" as "completed" | "upcoming",
    status: "",
    startDate: "",
    completionDate: "",
    clientName: "",
  });
  const [projectBids, setProjectBids] = useState<Record<string, any[]>>({});

  const loadBids = async (projectId: string) => {
    if (projectBids[projectId]) return;
    const bids = await bidsForProject({ projectId: projectId as any });
    setProjectBids((prev) => ({ ...prev, [projectId]: bids }));
  };

  const handleCreateProject = async () => {
    await createProject({
      title: form.title,
      description: form.description,
      location: form.location,
      trade: form.trade,
      budget: form.budget ? Number(form.budget) : undefined,
      type: form.type,
      status: form.status || "planned",
      startDate: form.startDate || undefined,
      completionDate: form.completionDate || undefined,
      clientName: form.clientName || undefined,
    });
    setShowForm(false);
    setForm({
      title: "",
      description: "",
      location: "",
      trade: "",
      budget: "",
      type: "upcoming",
      status: "",
      startDate: "",
      completionDate: "",
      clientName: "",
    });
  };

  const handleBidAction = async (
    bidId: string,
    status: "accepted" | "rejected"
  ) => {
    await updateBidStatus({ bidId: bidId as any, status });
    setProjectBids({});
  };

  return (
    <div className="dashboard-grid">
      <div className="card">
        <div className="card-header">
          <h2>Admin Dashboard</h2>
          <div className="admin-actions">
            <button
              className={`tab ${tab === "projects" ? "active" : ""}`}
              onClick={() => setTab("projects")}
            >
              Projects
            </button>
            <button
              className={`tab ${tab === "vendors" ? "active" : ""}`}
              onClick={() => setTab("vendors")}
            >
              Vendors ({vendors?.length ?? 0})
            </button>
          </div>
        </div>

        {tab === "projects" && (
          <div className="card-body">
            <div style={{ marginBottom: 16 }}>
              <button
                className="btn btn-sm"
                onClick={() => setShowForm(!showForm)}
              >
                {showForm ? "Cancel" : "+ New Project"}
              </button>
            </div>

            {showForm && (
              <div
                style={{
                  background: "#f8f9fa",
                  padding: 16,
                  borderRadius: 6,
                  marginBottom: 20,
                }}
              >
                <h3 style={{ marginBottom: 12 }}>Create Project</h3>
                <div className="project-form">
                  <div className="full-width form-group">
                    <label>Title</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) =>
                        setForm({ ...form, title: e.target.value })
                      }
                    />
                  </div>
                  <div className="full-width form-group">
                    <label>Description</label>
                    <textarea
                      rows={3}
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        border: "1px solid #ccc",
                        borderRadius: 4,
                        fontFamily: "inherit",
                        fontSize: 14,
                        resize: "vertical",
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Location</label>
                    <input
                      type="text"
                      value={form.location}
                      onChange={(e) =>
                        setForm({ ...form, location: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Trade</label>
                    <select
                      value={form.trade}
                      onChange={(e) =>
                        setForm({ ...form, trade: e.target.value })
                      }
                    >
                      <option value="">Select...</option>
                      <option>Striping</option>
                      <option>Painting</option>
                      <option>HVAC</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Budget</label>
                    <input
                      type="number"
                      value={form.budget}
                      onChange={(e) =>
                        setForm({ ...form, budget: e.target.value })
                      }
                      placeholder="$"
                    />
                  </div>
                  <div className="form-group">
                    <label>Type</label>
                    <select
                      value={form.type}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          type: e.target.value as any,
                        })
                      }
                    >
                      <option value="upcoming">Upcoming / Open for Bids</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <input
                      type="text"
                      value={form.status}
                      onChange={(e) =>
                        setForm({ ...form, status: e.target.value })
                      }
                      placeholder="e.g. planned, in-progress"
                    />
                  </div>
                  <div className="form-group">
                    <label>Start Date</label>
                    <input
                      type="text"
                      value={form.startDate}
                      onChange={(e) =>
                        setForm({ ...form, startDate: e.target.value })
                      }
                      placeholder="e.g. June 2026"
                    />
                  </div>
                  <div className="form-group">
                    <label>Client Name</label>
                    <input
                      type="text"
                      value={form.clientName}
                      onChange={(e) =>
                        setForm({ ...form, clientName: e.target.value })
                      }
                    />
                  </div>
                </div>
                <button
                  className="btn btn-sm"
                  style={{ marginTop: 12 }}
                  onClick={handleCreateProject}
                >
                  Create Project
                </button>
              </div>
            )}

            <h3 style={{ marginBottom: 12, fontSize: 15, color: "#555" }}>
              Upcoming / Open for Bids
            </h3>
            {upcomingProjects?.length === 0 && (
              <p style={{ color: "#666", fontSize: 14, marginBottom: 16 }}>
                No upcoming projects.
              </p>
            )}
            {upcomingProjects?.map((p) => (
              <div className="project-card" key={p._id}>
                <h3>{p.title}</h3>
                <p>{p.description}</p>
                <div className="project-meta">
                  <span className="badge badge-upcoming">Open for Bids</span>
                  <span>{p.location}</span>
                  <span>{p.trade}</span>
                  {p.budget && <span>${p.budget.toLocaleString()}</span>}
                </div>
                <button
                  className="btn btn-sm btn-secondary"
                  style={{ marginTop: 8 }}
                  onClick={() => loadBids(p._id)}
                >
                  View Bids
                </button>
                {projectBids[p._id] && (
                  <div style={{ marginTop: 12 }}>
                    {projectBids[p._id].length === 0 ? (
                      <p style={{ fontSize: 13, color: "#666" }}>
                        No bids yet.
                      </p>
                    ) : (
                      projectBids[p._id].map((bid: any) => (
                        <div
                          key={bid._id}
                          style={{
                            padding: "8px 12px",
                            background: "#f9f9f9",
                            borderRadius: 4,
                            marginBottom: 8,
                            fontSize: 14,
                          }}
                        >
                          <strong>Vendor:</strong> {bid.vendorId}{" "}
                          <strong>Amount:</strong> $
                          {bid.amount.toLocaleString()}{" "}
                          <span
                            className={`badge ${
                              bid.status === "accepted"
                                ? "badge-accepted"
                                : bid.status === "rejected"
                                ? "badge-rejected"
                                : "badge-pending"
                            }`}
                          >
                            {bid.status}
                          </span>
                          {bid.status === "pending" && (
                            <span style={{ marginLeft: 8 }}>
                              <button
                                className="btn btn-sm"
                                style={{
                                  background: "#2e7d32",
                                  marginRight: 4,
                                }}
                                onClick={() =>
                                  handleBidAction(bid._id, "accepted")
                                }
                              >
                                Accept
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() =>
                                  handleBidAction(bid._id, "rejected")
                                }
                              >
                                Reject
                              </button>
                            </span>
                          )}
                          {bid.notes && (
                            <p style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                              Note: {bid.notes}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}

            <h3
              style={{
                marginBottom: 12,
                fontSize: 15,
                color: "#555",
                marginTop: 24,
              }}
            >
              Completed
            </h3>
            {completedProjects?.length === 0 && (
              <p style={{ color: "#666", fontSize: 14 }}>
                No completed projects.
              </p>
            )}
            {completedProjects?.map((p) => (
              <div className="project-card" key={p._id}>
                <h3>{p.title}</h3>
                <p>{p.description}</p>
                <div className="project-meta">
                  <span className="badge badge-completed">Completed</span>
                  <span>{p.location}</span>
                  <span>{p.trade}</span>
                  {p.completionDate && <span>{p.completionDate}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "vendors" && (
          <div className="card-body">
            {!vendors ? (
              <p>Loading...</p>
            ) : vendors.length === 0 ? (
              <p>No vendors registered yet.</p>
            ) : (
              vendors.map((v) => (
                <div className="project-card" key={v._id}>
                  <h3>{v.name}</h3>
                  <p>
                    <strong>Company:</strong> {v.company}
                  </p>
                  <p>
                    <strong>Email:</strong> {v.email}
                  </p>
                  <p>
                    <strong>Phone:</strong> {v.phone}
                  </p>
                  <p>
                    <strong>Status:</strong>{" "}
                    {v.isApproved ? (
                      <span className="badge badge-accepted">Approved</span>
                    ) : (
                      <span className="badge badge-pending">Pending</span>
                    )}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
