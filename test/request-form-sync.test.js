const assert = require('assert');
const { createPendingRequestForm } = require('../utils/requestFormSync');

(async () => {
  const pool = {
    execute: async (query, params) => {
      assert.match(query, /INSERT INTO student_activity_requests/i);
      assert.deepStrictEqual(params, [42, 'campus']);
      return [{ insertId: 99 }];
    }
  };

  const result = await createPendingRequestForm(pool, { userId: 42, formType: 'campus', createRequestForm: true });
  assert.deepStrictEqual(result, { insertedId: 99 });
  console.log('request-form-sync test passed');
})();
