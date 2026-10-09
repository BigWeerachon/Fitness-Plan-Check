import { describe, expect, it } from '@jest/globals';
import { formFromValues, parseProfileForm, switchFormUnits, type ProfileForm } from '@/domain/profileInput';

const base: ProfileForm = {
  sex: 'female',
  age: '30',
  heightCm: '165',
  heightFt: '',
  heightIn: '',
  weight: '60',
  activityLevel: 'moderate',
  goal: 'lose',
  weightUnit: 'kg',
  lengthUnit: 'cm',
};

describe('profile form parsing (SPEC C step 2, H1)', () => {
  it('parses metric input', () => {
    const { values, errors } = parseProfileForm(base);
    expect(errors).toEqual({});
    expect(values).toMatchObject({ age: 30, heightCm: 165, weightKg: 60, sex: 'female' });
  });

  it('converts imperial input to kg/cm', () => {
    const { values, errors } = parseProfileForm({
      ...base,
      lengthUnit: 'ftin',
      heightFt: '5',
      heightIn: '5',
      weightUnit: 'lb',
      weight: '132',
    });
    expect(errors).toEqual({});
    expect(values.heightCm).toBeCloseTo(165.1, 1);
    expect(values.weightKg).toBeCloseTo(59.87, 2);
  });

  it('all fields are optional', () => {
    const { values, errors } = parseProfileForm({
      ...base,
      age: '',
      heightCm: '',
      weight: '',
      sex: null,
      goal: null,
      activityLevel: null,
    });
    expect(errors).toEqual({});
    expect(values).toMatchObject({ age: null, heightCm: null, weightKg: null });
  });

  it('rejects out-of-range or non-numeric values with the allowed range in the user unit', () => {
    const { errors } = parseProfileForm({ ...base, age: '9', heightCm: 'abc', weight: '500' });
    expect(errors.age).toEqual({ min: 13, max: 100 });
    expect(errors.height).toEqual({ min: 100, max: 250 });
    expect(errors.weight).toEqual({ min: 30, max: 300 });
    const lb = parseProfileForm({ ...base, weightUnit: 'lb', weight: '20' });
    expect(lb.errors.weight).toEqual({ min: 66, max: 661 });
    expect(parseProfileForm({ ...base, age: '30.5' }).errors.age).toBeDefined();
  });

  it('round-trips stored values back into the form in the chosen units', () => {
    const f = formFromValues({ heightCm: 180, weightKg: 80, weightUnit: 'lb', lengthUnit: 'ftin', age: 25 });
    expect(f).toMatchObject({ heightFt: '5', heightIn: '11', weight: '176.4', age: '25' });
  });
});

describe('switchFormUnits', () => {
  const metricForm = formFromValues({ weightKg: 70, heightCm: 180, weightUnit: 'kg', lengthUnit: 'cm' });

  it('converts the typed weight when switching kg ↔ lb', () => {
    const lb = switchFormUnits(metricForm, { weightUnit: 'lb' });
    expect(lb.weightUnit).toBe('lb');
    expect(lb.weight).toBe('154.3');
    const back = switchFormUnits(lb, { weightUnit: 'kg' });
    expect(back.weight).toBe('70');
    expect(parseProfileForm(back).values.weightKg).toBe(70);
  });

  it('converts height between cm and ft/in', () => {
    const imperial = switchFormUnits(metricForm, { lengthUnit: 'ftin' });
    expect(imperial).toMatchObject({ lengthUnit: 'ftin', heightFt: '5', heightIn: '11' });
    const metric = switchFormUnits(imperial, { lengthUnit: 'cm' });
    expect(Number(metric.heightCm)).toBeCloseTo(180, 0);
  });

  it('keeps empty or unreadable values untouched', () => {
    const empty = formFromValues({});
    expect(switchFormUnits(empty, { weightUnit: 'lb', lengthUnit: 'ftin' })).toMatchObject({
      weight: '',
      heightFt: '',
      heightIn: '',
      weightUnit: 'lb',
      lengthUnit: 'ftin',
    });
    const junk = { ...metricForm, weight: 'abc' };
    expect(switchFormUnits(junk, { weightUnit: 'lb' }).weight).toBe('abc');
    expect(switchFormUnits(metricForm, {})).toEqual(metricForm);
  });
});
