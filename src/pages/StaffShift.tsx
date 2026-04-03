import React from 'react';
import './StaffShift.css'; // Import improved CSS for styling

const StaffShift = () => {
  return (
    <div className="staff-shift-container">
      <h1 className="title">Staff Shift Management</h1>
      <div className="shift-list">
        {/* Enhanced design, priority visualization, confetti effects, and micro-interactions */}
        <div className="shift-item priority-high">
          <p>Shift 1: 8 AM - 12 PM</p>
          <button className="btn-assign">Assign</button>
        </div>
        <div className="shift-item priority-medium">
          <p>Shift 2: 12 PM - 4 PM</p>
          <button className="btn-assign">Assign</button>
        </div>
        <div className="shift-item priority-low">
          <p>Shift 3: 4 PM - 8 PM</p>
          <button className="btn-assign">Assign</button>
        </div>
      </div>
      {/* Confetti effect trigger button */}
      <button className="btn-confetti" onClick={triggerConfetti}>Celebrate!</button>
    </div>
  );
};

const triggerConfetti = () => {
  // Logic for confetti effects
};

export default StaffShift;