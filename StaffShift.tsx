import React, { useEffect, useState } from 'react';
import { QRCode } from 'react-qr-code';
import { useNotifications } from 'react-notification';
import audioAlert from './audio/alert.mp3';

const StaffShift = () => {
    const [shiftData, setShiftData] = useState([]);
    const { notify } = useNotifications();

    useEffect(() => {
        const fetchShiftData = async () => {
            // Fetch shift data from an API
            const response = await fetch('/api/shifts');
            const data = await response.json();
            setShiftData(data);

            // Notify staff in real-time
            notify('New shift data loaded!');
            const audio = new Audio(audioAlert);
            audio.play();
        };

        fetchShiftData();
    }, []);

    return (
        <div>
            <h1>Staff Shifts</h1>
            {shiftData.map(shift => (
                <div key={shift.id}>
                    <h2>{shift.staffName}</h2>
                    <p>{shift.startTime} - {shift.endTime}</p>
                    <QRCode value={`${shift.staffName} - ${shift.startTime}`} />
                </div>
            ))}
        </div>
    );
};

export default StaffShift;