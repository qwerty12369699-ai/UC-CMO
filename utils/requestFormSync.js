async function createPendingRequestForm(pool, { userId, formType, createRequestForm = false }) {
  if (!createRequestForm || !userId || !formType) {
    return null;
  }

  if (!['campus', 'internal', 'external'].includes(formType)) {
    return null;
  }

  const [result] = await pool.execute(
    `
      INSERT INTO student_activity_requests
      (user_id, reservation_type, pdf_url, status, version)
      VALUES (?, ?, '', 'pending', 1)
    `,
    [userId, formType]
  );

  return { insertedId: result.insertId };
}

module.exports = {
  createPendingRequestForm
};
