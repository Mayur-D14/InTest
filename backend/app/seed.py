from sqlalchemy.orm import Session
from app import models


def seed_if_empty(db: Session):
    if db.query(models.Project).count() > 0:
        return  # already seeded

    project = models.Project(
        name="E-Commerce Web App",
        description="Sample project seeded on first run \u2014 delete anytime.",
    )
    db.add(project)
    db.flush()

    suite = models.TestSuite(
        project_id=project.id,
        name="Checkout Flow",
        description="Test cases covering the cart-to-payment checkout journey.",
    )
    db.add(suite)
    db.flush()

    def make_case(title, preconditions, priority, severity, status, tags, steps, summary):
        tc = models.TestCase(test_suite_id=suite.id)
        db.add(tc)
        db.flush()
        version = models.TestCaseVersion(
            test_case_id=tc.id,
            version_number=1,
            title=title,
            preconditions=preconditions,
            priority=priority,
            severity=severity,
            status=status,
            tags=tags,
            changed_by="seed-script",
            change_summary=summary,
        )
        db.add(version)
        db.flush()
        for i, (action, expected) in enumerate(steps, start=1):
            db.add(models.TestCaseStep(
                test_case_version_id=version.id,
                step_number=i,
                action=action,
                expected_result=expected,
            ))
        db.flush()
        tc.current_version_id = version.id
        return tc

    make_case(
        title="Successful checkout with valid credit card",
        preconditions="User is logged in and has 1+ items in cart.",
        priority=models.Priority.CRITICAL,
        severity=models.Severity.BLOCKER,
        status=models.TestCaseStatus.ACTIVE,
        tags=["checkout", "payments", "smoke"],
        steps=[
            ("Navigate to cart and click 'Checkout'", "Checkout page loads with order summary"),
            ("Enter valid shipping address", "Address is accepted, shipping cost calculated"),
            ("Enter valid credit card details and submit", "Order confirmation page is shown with order number"),
        ],
        summary="Initial version",
    )

    make_case(
        title="Checkout blocked when cart is empty",
        preconditions="User is logged in with an empty cart.",
        priority=models.Priority.MEDIUM,
        severity=models.Severity.MINOR,
        status=models.TestCaseStatus.ACTIVE,
        tags=["checkout", "edge-case"],
        steps=[
            ("Navigate directly to /checkout URL with empty cart", "User is redirected to cart page"),
            ("Verify message is shown", "Message reads 'Your cart is empty'"),
        ],
        summary="Initial version",
    )

    make_case(
        title="Promo code applies correct discount",
        preconditions="User has items in cart totaling $100+.",
        priority=models.Priority.HIGH,
        severity=models.Severity.MAJOR,
        status=models.TestCaseStatus.DRAFT,
        tags=["checkout", "promotions"],
        steps=[
            ("Enter valid promo code 'SAVE10' at checkout", "10% discount is applied to order total"),
            ("Proceed to payment", "Discounted total is reflected in payment summary"),
        ],
        summary="Initial version",
    )

    db.commit()
