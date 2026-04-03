// Original content of StaffShift.tsx goes here

// Functionality for staff shift management
// Add necessary imports
import React from 'react';
import { Badge, Tooltip } from 'antd';
import './StaffShift.css'; // Assuming CSS for styling

const StaffShift = ({ shifts }) => {
    return (
        <div className="staff-shift">
            {shifts.map((shift) => (
                <div className="shift" key={shift.id}>
                    <Badge count={shift.priority} className="shift-badge" />
                    <Tooltip title={`Shift for ${shift.name}`}>
                        <div className="shift-details">
                            <h3>{shift.name}</h3>
                            <p>{shift.time}</p>
                        </div>
                    </Tooltip>
                </div>
            ))}
        </div>
    );
};

export default StaffShift;