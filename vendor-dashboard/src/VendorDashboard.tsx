import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

export default function VendorDashboard() {
  const user = useQuery(api.users.getCurrentUser);
  const completedProjects = useQuery(api.projects.listCompleted);
  const upcomingProjects = useQuery(api.projects.listUpcoming);
  const myBids = useQuery(api.bids.listMyBids);
  const updateProfile = useMutation(api.users.updateProfile);
  const submitBid = useMutation(api.bids.submitBid);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [bidProjectId, setBidProjectId] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [bidNotes, setBidNotes] = useState("");
  const [bidError, setBidError] = useState("");
  const [profileMsg, setProfileMsg] = useState("");

  const startEdit = () => {
    if (!user) return;
    setName(user.name ?? "");
    setCompany(user.company ?? "");
    setPhone(user.phone ?? "");
    setEditing(true);
  };

  const saveProfile = async () => {
    await updateProfile({ name, company, phone });
    setEditing(false);
    setProfileMsg("Profile updated");
    setTimeout(() => setProfileMsg(""), 3000);
  };

  const handleBid = async (projectId: string) => {
    if (!bidAmount || isNaN(Number(bidAmount))) {
      setBidError("Enter a valid bid amount");
      return;
    }
    try {
      await submitBid({
        projectId: projectId as any,
        amount: Number(bidAmount),
        notes: bidNotes,
      });
      setBidProjectId(null);
      setBidAmount("");
      setBidNotes("");
      setBidError("");
    } catch (err: any) {
      setBidError(err?.message ?? "Bid failed");
    }
  };

  const hasBid = (projectId: string) =>
    myBids?.some((b) => b.projectId === projectId);

  const getMyBid = (projectId: string) =>
    myBids?.find((b) => b.projectId === projectId);

  return (
    <div className="dashboard-grid">
      {/* Profile */}
      <div className="card">
        <div className="card-header">
          <h2>My Profile</h2>
          {!editing && (
            <button className="btn btn-sm btn-secondary" onClick={startEdit}>
              Edit
            </button>
          )}
        </div>
        <div className="card-body">
          {editing ? (
            <>
              <div className="profile-grid">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Company</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="text" value={user?.email ?? ""} disabled />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                <button className="btn btn-sm" onClick={saveProfile}>
                  Save
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
              </div>
              {profileMsg && (
                <div className="success-msg">{profileMsg}</div>
              )}
            </>
          ) : (
            <>
              <p>
                <label>Name:</label> {user?.name}
              </p>
              <p>
                <label>Company:</label> {user?.company}
              </p>
              <p>
                <label>Email:</label> {user?.email}
              </p>
              <p>
                <label>Phone:</label> {user?.phone}
              </p>
              <p>
                <label>Role:</label>{" "}
                <span className="badge badge-pending">Vendor</span>
              </p>
            </>
          )}
        </div>
      </div>

      {/* Completed Projects */}
      <div className="card">
        <div className="card-header">
          <h2>Completed Projects</h2>
        </div>
        <div className="card-body">
          {!completedProjects ? (
            <p>Loading...</p>
          ) : completedProjects.length === 0 ? (
            <p>No completed projects yet.</p>
          ) : (
            completedProjects.map((p) => (
              <div className="project-card" key={p._id}>
                <h3>{p.title}</h3>
                <p>{p.description}</p>
                <div className="project-meta">
                  <span className="badge badge-completed">Completed</span>
                  <span>{p.location}</span>
                  <span>{p.trade}</span>
                  {p.completionDate && <span>Completed: {p.completionDate}</span>}
                </div>
                {myBids && getMyBid(p._id) && (
                  <div className="bid-section">
                    <strong>Your Bid:</strong> ${getMyBid(p._id)!.amount.toLocaleString()}{" "}
                    <span
                      className={`badge ${
                        getMyBid(p._id)!.status === "accepted"
                          ? "badge-accepted"
                          : getMyBid(p._id)!.status === "rejected"
                          ? "badge-rejected"
                          : "badge-pending"
                      }`}
                    >
                      {getMyBid(p._id)!.status}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Upcoming Projects - Open for Bids */}
      <div className="card">
        <div className="card-header">
          <h2>Projects Open for Bids</h2>
        </div>
        <div className="card-body">
          {!upcomingProjects ? (
            <p>Loading...</p>
          ) : upcomingProjects.length === 0 ? (
            <p>No projects available for bidding at this time.</p>
          ) : (
            upcomingProjects.map((p) => {
              const alreadyBid = hasBid(p._id);
              return (
                <div className="project-card" key={p._id}>
                  <h3>{p.title}</h3>
                  <p>{p.description}</p>
                  <div className="project-meta">
                    <span className="badge badge-upcoming">Open for Bids</span>
                    <span>{p.location}</span>
                    <span>{p.trade}</span>
                    {p.budget && (
                      <span>Est. Budget: ${p.budget.toLocaleString()}</span>
                    )}
                    {p.startDate && <span>Start: {p.startDate}</span>}
                  </div>

                  {alreadyBid ? (
                    <div className="bid-section">
                      <strong>Your Bid:</strong> $
                      {getMyBid(p._id)!.amount.toLocaleString()}{" "}
                      <span
                        className={`badge ${
                          getMyBid(p._id)!.status === "accepted"
                            ? "badge-accepted"
                            : getMyBid(p._id)!.status === "rejected"
                            ? "badge-rejected"
                            : "badge-pending"
                        }`}
                      >
                        {getMyBid(p._id)!.status}
                      </span>
                    </div>
                  ) : bidProjectId === p._id ? (
                    <div className="bid-section">
                      <div className="inline-form">
                        <input
                          type="number"
                          placeholder="Bid amount ($)"
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Notes (optional)"
                          value={bidNotes}
                          onChange={(e) => setBidNotes(e.target.value)}
                        />
                        <button
                          className="btn btn-sm"
                          onClick={() => handleBid(p._id)}
                        >
                          Submit Bid
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => {
                            setBidProjectId(null);
                            setBidError("");
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                      {bidError && <div className="error-msg">{bidError}</div>}
                    </div>
                  ) : (
                    <div className="bid-section">
                      <button
                        className="btn btn-sm"
                        onClick={() => setBidProjectId(p._id)}
                      >
                        Bid on This Project
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
