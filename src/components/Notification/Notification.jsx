import React, { useEffect, useRef } from 'react'
import "./Notification.scss"

const SidebarNotification = ({ content, onClose }) => {
	const notificationRef = useRef(null)

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (
				notificationRef.current &&
				!notificationRef.current.contains(event.target)
			) {
				onClose()
			}
		}

		document.addEventListener('mousedown', handleClickOutside)
		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [onClose])

	return (
		<div className="notification-overlay">
			<div ref={notificationRef} className="centered-notification">
				<h2 className="notification-title">Cinema Update</h2>
				<div className="notification-content">
					{content}
					<button className="notification-close" onClick={onClose}>
						&times;
					</button>
				</div>
			</div>
		</div>
	)
}

export default SidebarNotification
