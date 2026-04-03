import React, { useEffect, useState } from 'react';
import { useSupabaseClient } from '@supabase/supabase-js';
import QRCode from 'qrcode.react';
import './StaffShift.css';

const StaffShift = () => {
  const supabase = useSupabaseClient();
  const [staffMembers, setStaffMembers] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchStaff = async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('*');
      if (error) console.error(error);
      else setStaffMembers(data);
    };
    fetchStaff();
  }, [supabase]);

  useEffect(() => {
    const userNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*');
      if (error) console.error(error);
      else setNotifications(data);
    };
    userNotifications();
  }, [supabase]);

  const playAudioAlert = () => {
    const audio = new Audio('/audio/alert.mp3');
    audio.play();
  };

  return (
    <div className="staff-shift-container">
      <h1 className="title">Staff Shift Management</h1>
      <div className="staff-list">
        {staffMembers.map((member) => (
          <div key={member.id} className="staff-item">
            <h2>{member.name}</h2>
            <QRCode value={member.id} />
          </div>
        ))}
      </div>
      <div className="notifications">
        {notifications.map((notif) => (
          <div key={notif.id} className="notification" onClick={playAudioAlert}>
            {notif.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StaffShift;