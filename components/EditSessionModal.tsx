import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Clock } from 'lucide-react';
import { Session } from '../types';
import { format } from 'date-fns';

interface EditSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    session: Session | null;
    onSave: (updatedSession: Session) => void;
}

const EditSessionModal: React.FC<EditSessionModalProps> = ({
    isOpen,
    onClose,
    session,
    onSave
}) => {
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    useEffect(() => {
        if (session) {
            // Format for datetime-local input: YYYY-MM-DDTHH:mm
            setStartTime(format(new Date(session.start_time), "yyyy-MM-dd'T'HH:mm"));
            if (session.end_time) {
                setEndTime(format(new Date(session.end_time), "yyyy-MM-dd'T'HH:mm"));
            } else {
                setEndTime('');
            }
        }
    }, [session]);

    const handleSave = () => {
        if (!session) return;

        const newStart = new Date(startTime).toISOString();
        let newEnd: string | null = null;
        let isActive = session.is_active;

        if (endTime) {
            newEnd = new Date(endTime).toISOString();
            // If we set an end time, it's no longer active (unless user clears it? datetime input doesn't easily allow clearing to null, assuming once set it's set)
            // Actually, if editing an active session, user might just want to change start time.
            // But if they provide end time, we close it.
            isActive = false;
        } else {
            // If end time is empty, it remains active IF it was active.
            // But usually this modal is for correcting past records.
            // If user clears end time on a finished session, should we make it active? 
            // Maybe simpler: Only allow editing end time if it already exists, or if we want to "close" it manually.
            // For now, let's assume if it's active, end time is empty.
            newEnd = null;
            isActive = true;
        }

        // Validate
        if (newEnd && new Date(newEnd) < new Date(newStart)) {
            alert("End time cannot be before start time");
            return;
        }

        onSave({
            ...session,
            start_time: newStart,
            end_time: newEnd,
            is_active: isActive
        });
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && session && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-surface border border-border rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl"
                    >
                        <div className="p-5 border-b border-border flex justify-between items-center bg-surfaceHighlight/50">
                            <h2 className="text-lg font-semibold text-textMain flex items-center gap-2">
                                <Clock size={18} /> Edit Session
                            </h2>
                            <button onClick={onClose} className="text-textMuted hover:text-textMain transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-textMuted uppercase tracking-wider mb-1.5">Activity</label>
                                <div className="text-textMain font-medium text-lg">{session.category}</div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-textMuted uppercase tracking-wider mb-1.5">Start Time</label>
                                <input
                                    type="datetime-local"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-textMain focus:outline-none focus:border-textMain/50"
                                    // Attempt to prevent future dates?
                                    max={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-textMuted uppercase tracking-wider mb-1.5">
                                    End Time {session.is_active && <span className="text-yellow-500 text-[10px] ml-2">(Currently Active)</span>}
                                </label>
                                <input
                                    type="datetime-local"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-textMain focus:outline-none focus:border-textMain/50 disabled:opacity-50"
                                    disabled={session.is_active && !endTime} // If active, maybe we don't force end time here? Or allow "finishing" it retroactively.
                                    // Let's allow editing it. If user picks a time, it ends.
                                    max={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                                />
                                {session.is_active && !endTime && (
                                    <p className="text-[10px] text-textMuted mt-1">Leave empty to keep running.</p>
                                )}
                            </div>

                            <div className="pt-4">
                                <button
                                    onClick={handleSave}
                                    className="w-full bg-textMain text-surface p-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                                >
                                    <Save size={18} /> Save Changes
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default EditSessionModal;
