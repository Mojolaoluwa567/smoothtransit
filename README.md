# Smooth Transit Global
Static site: index, about, services, contact. Libraries (GSAP, ScrollTrigger, Lenis) load from CDN.
Before launch: replace the placeholder phone number (+234 XXX XXXX XXXX) in every page footer and in contact.html, and connect the contact form to an email or form service.

## Page transitions (how they work)
- `js/boot.js` runs in `<head>` on every page, before first paint. It detects "arriving from a transition" / "first home visit" and sets root classes. It also has an 8s failsafe so a failed CDN can never leave a cover on screen.
- Each page ships its own `.pt` cover markup (its own heading + caption) and loads `css/motion.css`, so the arrival frame is identical to the departure frame.
- To add a page: copy the `<script src="js/boot.js">`, the `motion.css` link and the `.pt` block from an existing page, and add its copy to `transitionPages` in `js/main.js`.
# smoothtransit
