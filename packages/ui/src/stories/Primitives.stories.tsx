import type { Meta, StoryObj } from '@storybook/react';
import { Check, Download, Search } from 'lucide-react';
import {
  Button,
  Checkbox,
  IconButton,
  Menu,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '../primitives';

const meta = { title: 'Primitives/Component gallery', component: Button, tags: ['autodocs'] } satisfies Meta<
  typeof Button
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const AllVariants: Story = {
  render: () => (
    <Stack gap="4">
      <Stack direction="row" gap="2">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="link">Link</Button>
      </Stack>
      <Stack direction="row" gap="2">
        <Button loading>Working</Button>
        <Button disabled>Disabled</Button>
        <Button iconStart={<Download />}>Export</Button>
        <IconButton label="Complete">
          <Check />
        </IconButton>
        <Tooltip content="Accessible tooltip">
          <Button>Hover me</Button>
        </Tooltip>
      </Stack>
      <TextInput icon={<Search />} placeholder="Search visitors…" aria-label="Search example" />
      <Stack direction="row" gap="3">
        <Checkbox label="Select row" />
        <Text tone="secondary">Checkbox · Text · Stack</Text>
        <Menu label="Open menu">
          <button type="button">First action</button>
          <button type="button">Second action</button>
        </Menu>
      </Stack>
      <SegmentedControl
        label="Mode"
        value="visitors"
        onChange={() => undefined}
        options={[
          { value: 'visitors', label: 'Visitors' },
          { value: 'visits', label: 'Visits' },
        ]}
      />
    </Stack>
  ),
};
