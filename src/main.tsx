import { Link as ReactRouterLink } from 'react-router-dom'
import { motion as m } from 'framer-motion';
import {
  Stack, Flex, Button, Text, VStack, useBreakpointValue,
  Link
} from '@chakra-ui/react'
import background from './background.png';

export default function PageMain() {
  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <Flex
        w={'full'}
        h={'100vh'}
        backgroundImage={
          `url(${background})`
        }
        backgroundSize={'cover'}
        backgroundPosition={'center center'}>
        <VStack
          w={'full'}
          justify={'center'}
          px={useBreakpointValue({ base: 4, md: 8 })}
          bgGradient={'linear(to-r, blackAlpha.600, blackAlpha.400)'}>
          <Stack maxW={'2xl'} align={'flex-start'} spacing={6}>
            <Text
              color={'white'}
              fontWeight={700}
              lineHeight={1.2}
              fontSize={useBreakpointValue({ base: '3xl', md: '4xl' })}>
              Puetsua's VRChat stuff
            </Text>
            <Stack direction={'row'}>
              <Link
                href={'https://puetsua.booth.pm'}
                isExternal
              >
                <Button
                  colorScheme={'purple'}
                  variant='solid'
                >
                  Booth.pm
                </Button>
              </Link>
              <Link as={ReactRouterLink} to={'/vpm'}>
                <Button
                  colorScheme={'purple'}
                  variant='solid'
                >
                  VPM Repository
                </Button>
              </Link>
            </Stack>
          </Stack>
        </VStack>
      </Flex>
    </m.div>
  )
}
