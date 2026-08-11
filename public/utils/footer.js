/* ============================================================
   Global Footer Injector – UC Campus Management Office
   ============================================================ */

/**
 * Injects a consistent, professional footer into any page.
 * Call after DOM is ready.
 */
function injectFooter() {
  const container = document.createElement('div');
  container.innerHTML = `
    <footer class="site-footer">
      <!-- Main Footer Content -->
      <div class="footer-main">
        <!-- Brand / About -->
        <div class="footer-col footer-brand">
          <div class="footer-logo">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/8/84/UC_Official_Logo.png"
              alt="UC Logo"
            />
            <span>Campus Management Office</span>
          </div>
          <p>
            Streamlining campus facility reservations and management for the
            University of the Cordilleras community. Book spaces, manage
            approvals, and stay informed — all in one place.
          </p>
          <div class="footer-social">
            <a href="https://www.facebook.com/UCjaguars" target="_blank" aria-label="Facebook">
              <i class="fab fa-facebook-f"></i>
            </a>
            <a href="https://x.com/UCJaguars" target="_blank" aria-label="Twitter">
              <i class="fab fa-twitter"></i>
            </a>
            <a href="https://www.youtube.com/@UCJaguars" target="_blank" aria-label="YouTube">
              <i class="fab fa-youtube"></i>
            </a>
          </div>
        </div>

        <!-- Quick Links -->
        <div class="footer-col">
          <h4>Quick Links</h4>
          <ul class="footer-links">
            <li><a href="/home"><i class="fas fa-chevron-right"></i> Dashboard</a></li>
            <li><a href="/user/reservation"><i class="fas fa-chevron-right"></i> Reservation</a></li>
            <li><a href="/user/main-campus"><i class="fas fa-chevron-right"></i> Main Campus</a></li>
            <li><a href="/user/legarda-campus"><i class="fas fa-chevron-right"></i> Legarda Campus</a></li>
            <li><a href="/admin/request-forms"><i class="fas fa-chevron-right"></i> Request Forms</a></li>
          </ul>
        </div>

        <!-- Resources -->
        <div class="footer-col">
          <h4>Resources</h4>
          <ul class="footer-links">
            <li><a href="/user/on-campus"><i class="fas fa-chevron-right"></i> On-Campus Form</a></li>
            <li><a href="/user/exemption-form"><i class="fas fa-chevron-right"></i> Exemption Form</a></li>
            <li><a href="/user/external-clients"><i class="fas fa-chevron-right"></i> External Clients</a></li>
            <li><a href="/user/internal-clients"><i class="fas fa-chevron-right"></i> Internal Clients</a></li>
            <li><a href="/admin/calendar"><i class="fas fa-chevron-right"></i> Calendar</a></li>
          </ul>
        </div>

        <!-- Contact -->
        <div class="footer-col">
          <h4>Contact</h4>
          <div class="footer-contact">
            <p>
              <i class="fas fa-map-marker-alt"></i>
              Gov. Pack Rd, Baguio City<br />
              2600 Philippines
            </p>
            <p>
              <i class="fas fa-phone-alt"></i>
              (074) 442-3316
            </p>
            <p>
              <i class="fas fa-envelope"></i>
              cmo@uc-bcf.edu.ph
            </p>
            <p>
              <i class="fas fa-clock"></i>
              Mon – Fri: 8:00 AM – 5:00 PM
            </p>
          </div>
        </div>
      </div>

      <!-- Copyright Bar -->
      <div class="footer-bottom">
        <div class="footer-bottom-inner">
          <p>&copy; 2025 University of the Cordilleras. All rights reserved.</p>
          <p>
            <a href="#">Privacy Policy</a> &middot;
            <a href="#">Terms of Service</a>
          </p>
        </div>
      </div>
    </footer>
  `;

  // Inject before the first <script> or at the end of <body>
  const scripts = document.querySelectorAll('script');
  if (scripts.length > 0) {
    document.body.insertBefore(container.firstElementChild, scripts[0]);
  } else {
    document.body.appendChild(container.firstElementChild);
  }
}

// Auto-inject when DOM is ready
document.addEventListener('DOMContentLoaded', injectFooter);