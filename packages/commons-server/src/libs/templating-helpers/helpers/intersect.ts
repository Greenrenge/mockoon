const intersect = (...args: any[]): number[] | null => {
  const parameters = args.slice(0, -1);

  const arrays = parameters
    .map((item) => (Array.isArray(item) ? item : [item]))
    .filter((arr) => arr.length > 0);

  if (arrays.length < 2) return null;

  const [firstArray, ...otherArrays] = arrays;

  const result = firstArray.filter((item) =>
    otherArrays.every((arr) => arr.includes(item))
  );

  return result.length > 0 ? result : null;
};

export default intersect;
